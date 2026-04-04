import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface RestAnalyserStackProps extends cdk.StackProps {
  domainName?: string;
  hostedZoneId?: string;
  certificateArn?: string;
}

export class RestAnalyserStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: RestAnalyserStackProps) {
    super(scope, id, props);

    // VPC with minimal resources for cost optimization
    const vpc = new ec2.Vpc(this, 'RestAnalyserVPC', {
      maxAzs: 2, // Use only 2 AZs for cost savings
      natGateways: 1, // Single NAT Gateway for cost savings (not HA but cheaper)
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    // EFS for SQLite database persistence
    const fileSystem = new efs.FileSystem(this, 'RestAnalyserEFS', {
      vpc,
      lifecyclePolicy: efs.LifecyclePolicy.AFTER_30_DAYS, // Move to IA after 30 days for cost savings
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      throughputMode: efs.ThroughputMode.BURSTING,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production
      encrypted: true,
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'RestAnalyserCluster', {
      vpc,
      containerInsights: false, // Disable for cost savings, enable in production
    });

    // Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'RestAnalyserTaskDef', {
      memoryLimitMiB: 512, // Minimal memory for cost optimization
      cpu: 256, // Minimal CPU for cost optimization
    });

    // Add EFS volume to task definition
    const volumeName = 'efs-storage';
    taskDefinition.addVolume({
      name: volumeName,
      efsVolumeConfiguration: {
        fileSystemId: fileSystem.fileSystemId,
        transitEncryption: 'ENABLED',
        authorizationConfig: {
          iam: 'ENABLED',
        },
      },
    });

    // CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, 'RestAnalyserLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK, // Short retention for cost savings
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Container Definition
    const container = taskDefinition.addContainer('RestAnalyserContainer', {
      image: ecs.ContainerImage.fromAsset('../backend', {
        file: 'Dockerfile',
      }),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'rest-analyser',
        logGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '3001',
        BASE_URL: props?.domainName
          ? `https://${props.domainName}`
          : 'https://your-domain.com',
      },
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3001/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    container.addPortMappings({
      containerPort: 3001,
      protocol: ecs.Protocol.TCP,
    });

    // Mount EFS volume
    container.addMountPoints({
      containerPath: '/app/data',
      sourceVolume: volumeName,
      readOnly: false,
    });

    // Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'RestAnalyserALB', {
      vpc,
      internetFacing: true,
      deletionProtection: false, // Set to true for production
    });

    // Target Group with WebSocket support
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'RestAnalyserTargetGroup', {
      vpc,
      port: 3001,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // HTTP Listener
    const httpListener = alb.addListener('HttpListener', {
      port: 80,
      open: true,
      defaultTargetGroups: [targetGroup],
    });

    // HTTPS Listener (optional - requires certificate)
    if (props?.certificateArn) {
      const certificate = acm.Certificate.fromCertificateArn(
        this,
        'Certificate',
        props.certificateArn
      );

      alb.addListener('HttpsListener', {
        port: 443,
        certificates: [certificate],
        defaultTargetGroups: [targetGroup],
      });

      // Redirect HTTP to HTTPS
      httpListener.addAction('RedirectToHttps', {
        action: elbv2.ListenerAction.redirect({
          protocol: 'HTTPS',
          port: '443',
          permanent: true,
        }),
      });
    }

    // ECS Service
    const service = new ecs.FargateService(this, 'RestAnalyserService', {
      cluster,
      taskDefinition,
      desiredCount: 1, // Single instance for cost optimization
      minHealthyPercent: 0, // Allow deployment with zero healthy tasks
      maxHealthyPercent: 200,
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      circuitBreaker: { rollback: true },
      enableExecuteCommand: true, // For debugging
    });

    // Allow service to mount EFS
    fileSystem.connections.allowDefaultPortFrom(service);
    fileSystem.grant(taskDefinition.taskRole, 'elasticfilesystem:ClientMount');

    // Attach service to target group
    service.attachToApplicationTargetGroup(targetGroup);

    // Auto Scaling (optional but recommended)
    const scaling = service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 4, // Limit for cost control
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // S3 Bucket for Frontend
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.LoadBalancerV2Origin(alb, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
        '/e/*': {
          origin: new origins.LoadBalancerV2Origin(alb, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe
      certificate: props?.certificateArn
        ? acm.Certificate.fromCertificateArn(this, 'CloudFrontCert', props.certificateArn)
        : undefined,
      domainNames: props?.domainName ? [props.domainName] : undefined,
    });

    // Deploy Frontend to S3
    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset('../frontend/dist')],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // Route53 (optional)
    if (props?.domainName && props?.hostedZoneId) {
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.domainName,
      });

      new route53.ARecord(this, 'AliasRecord', {
        zone: hostedZone,
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(distribution)
        ),
      });
    }

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: alb.loadBalancerDnsName,
      description: 'Application Load Balancer DNS',
    });

    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'Frontend S3 Bucket Name',
    });

    if (props?.domainName) {
      new cdk.CfnOutput(this, 'CustomDomainURL', {
        value: `https://${props.domainName}`,
        description: 'Custom Domain URL',
      });
    }
  }
}
