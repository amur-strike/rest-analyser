# AWS Deployment Guide - REST Endpoint Analyser

This guide covers deploying the REST Endpoint Analyser to AWS using cost-effective infrastructure.

## Cost Breakdown

### Architecture 1: ECS Fargate (Recommended)
**Monthly Cost**: ~$70-90 for low-medium traffic

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| ECS Fargate | 1 task (0.25 vCPU, 0.5GB RAM) | ~$15-20 |
| Application Load Balancer | Single ALB | ~$20 |
| NAT Gateway | Single NAT Gateway | ~$32 |
| EFS | <1GB with IA after 30 days | ~$1-3 |
| S3 + CloudFront | Static hosting | ~$1-5 |
| Data Transfer | Varies by traffic | ~$1-10 |

**Features**:
- ✅ Persistent SQLite database on EFS
- ✅ WebSocket support via ALB
- ✅ Auto-scaling (1-4 tasks)
- ✅ Full control over infrastructure
- ✅ VPC isolation

### Architecture 2: App Runner (Alternative)
**Monthly Cost**: ~$40-60 for low traffic

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| App Runner | 0.25 vCPU, 0.5GB RAM | ~$5-15 |
| S3 + CloudFront | Static hosting | ~$1-5 |
| RDS Aurora Serverless | Required (no EFS) | ~$30-40 |

**Features**:
- ✅ Simpler deployment
- ✅ Pay-per-use pricing
- ❌ No persistent file storage (need RDS)
- ❌ Potential cold starts
- ❌ Less networking control

### Cost Optimization Tips

**Reduce by 30-50%**:
1. Use Fargate Spot (70% cheaper, less reliable)
2. Scale to 0 during off-hours with scheduled Lambda
3. Use VPC Endpoints instead of NAT Gateway
4. Set CloudWatch log retention to 1 day

**Free Tier Benefits** (first 12 months):
- 750 hours/month ECS Fargate
- 50GB/month data transfer
- Limited RDS usage

## Quick Start Deployment

### Prerequisites

1. AWS Account with administrator access
2. AWS CLI installed and configured:
```bash
aws configure
```

3. Node.js 18+ and Docker installed

4. CDK CLI installed:
```bash
npm install -g aws-cdk
```

### Deploy with One Command

```bash
# Install all dependencies and deploy
npm run install:all
npm run cdk:deploy
```

The script will:
1. Build the frontend
2. Build the backend
3. Deploy infrastructure to AWS
4. Output the application URL

### Manual Step-by-Step Deployment

#### 1. Bootstrap CDK (First Time Only)

```bash
cd cdk
npm install
npx cdk bootstrap
```

#### 2. Build Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

#### 3. Deploy Infrastructure

```bash
cd cdk
npm run deploy
```

#### 4. Get Application URL

After deployment completes, note the CloudFront URL from the outputs:
```
Outputs:
RestAnalyserStack.CloudFrontURL = https://d1234567890.cloudfront.net
```

## Custom Domain Setup

### 1. Create SSL Certificate

In AWS Certificate Manager (us-east-1 region):

```bash
# Request certificate
aws acm request-certificate \
  --domain-name analyser.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

### 2. Validate Domain

Follow the DNS validation instructions in ACM console.

### 3. Update CDK Configuration

Edit `cdk/bin/rest-analyser.ts`:

```typescript
new RestAnalyserStack(app, 'RestAnalyserStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  domainName: 'analyser.yourdomain.com',
  certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/xxx-xxx',
  hostedZoneId: 'Z1234567890ABC', // Your Route53 hosted zone ID
});
```

### 4. Redeploy

```bash
cd cdk
npm run deploy
```

## Testing the Deployment

### 1. Access the Application

Open the CloudFront URL in your browser:
```
https://d1234567890.cloudfront.net
```

### 2. Test Endpoint Generation

1. Click "Generate New URL"
2. Copy the generated endpoint URL

### 3. Send Test Request

```bash
# Replace with your actual endpoint URL
curl -X POST https://d1234567890.cloudfront.net/e/abc12345 \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from AWS!"}'
```

### 4. Verify in UI

The request should appear immediately in the web interface.

## Monitoring

### CloudWatch Logs

View application logs:

```bash
# List log streams
aws logs tail /aws/ecs/rest-analyser --follow

# Or in AWS Console
# CloudWatch > Log groups > /aws/ecs/rest-analyser
```

### ECS Service Health

Check service status:

```bash
aws ecs describe-services \
  --cluster RestAnalyserStack-RestAnalyserCluster \
  --services RestAnalyserStack-RestAnalyserService
```

### Cost Explorer

Monitor spending:
1. Go to AWS Cost Explorer
2. Filter by service: ECS, EFS, ALB, etc.
3. Set up budget alerts

### CloudWatch Alarms

Set up cost alerts:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name high-cost-alert \
  --alarm-description "Alert when estimated charges exceed $100" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold
```

## Scaling Configuration

### Adjust Task Resources

Edit `cdk/lib/rest-analyser-stack.ts`:

```typescript
const taskDefinition = new ecs.FargateTaskDefinition(this, 'RestAnalyserTaskDef', {
  memoryLimitMiB: 512,  // 512, 1024, 2048, 4096
  cpu: 256,              // 256, 512, 1024, 2048, 4096
});
```

### Adjust Auto-Scaling

```typescript
const scaling = service.autoScaleTaskCount({
  minCapacity: 1,   // Minimum tasks (1 for always-on)
  maxCapacity: 10,  // Maximum tasks
});

scaling.scaleOnCpuUtilization('CpuScaling', {
  targetUtilizationPercent: 70,
});
```

### Deploy Changes

```bash
cd cdk
npm run deploy
```

## Troubleshooting

### Issue: Frontend shows 404

**Solution**:
1. Verify frontend build completed: `ls -la frontend/dist`
2. Check S3 bucket has files: `aws s3 ls s3://your-bucket-name`
3. Invalidate CloudFront cache:
```bash
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

### Issue: Backend not responding

**Solution**:
1. Check ECS task is running:
```bash
aws ecs list-tasks --cluster RestAnalyserStack-RestAnalyserCluster
```

2. View task logs:
```bash
aws logs tail /aws/ecs/rest-analyser --follow
```

3. Check ALB health checks:
```bash
aws elbv2 describe-target-health \
  --target-group-arn <target-group-arn>
```

### Issue: Database not persisting

**Solution**:
1. Verify EFS mounted:
```bash
aws ecs execute-command \
  --cluster RestAnalyserStack-RestAnalyserCluster \
  --task <task-id> \
  --container RestAnalyserContainer \
  --interactive \
  --command "df -h"
```

2. Check EFS mount target security groups allow traffic from ECS tasks

### Issue: High costs

**Solution**:
1. Check running tasks:
```bash
aws ecs describe-services \
  --cluster RestAnalyserStack-RestAnalyserCluster \
  --services RestAnalyserStack-RestAnalyserService
```

2. Review CloudWatch metrics for scaling activity
3. Consider reducing `maxCapacity` in auto-scaling config
4. Check NAT Gateway traffic (main cost driver)

## Advanced: Using Fargate Spot

Reduce costs by ~70% with Fargate Spot (less reliable):

Edit `cdk/lib/rest-analyser-stack.ts`:

```typescript
const service = new ecs.FargateService(this, 'RestAnalyserService', {
  cluster,
  taskDefinition,
  capacityProviderStrategies: [
    {
      capacityProvider: 'FARGATE_SPOT',
      weight: 2,
    },
    {
      capacityProvider: 'FARGATE',
      weight: 1,
      base: 1, // Keep at least 1 on-demand task
    },
  ],
  // ... rest of config
});
```

## Cleanup

### Destroy All Resources

```bash
npm run cdk:destroy
```

Or manually:

```bash
cd cdk
npx cdk destroy
```

**Warning**: This will delete all data including the database.

### Preserve Data

To keep EFS data, change in `cdk/lib/rest-analyser-stack.ts`:

```typescript
const fileSystem = new efs.FileSystem(this, 'RestAnalyserEFS', {
  // ...
  removalPolicy: cdk.RemovalPolicy.RETAIN, // Change from DESTROY
});
```

## Security Hardening for Production

### 1. Enable HTTPS Redirect

Already configured when using custom domain with certificate.

### 2. Add AWS WAF

Add to CloudFront distribution:

```typescript
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';

const webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
  defaultAction: { allow: {} },
  scope: 'CLOUDFRONT',
  visibilityConfig: {
    cloudWatchMetricsEnabled: true,
    metricName: 'WebAcl',
    sampledRequestsEnabled: true,
  },
  rules: [
    {
      name: 'RateLimitRule',
      priority: 1,
      statement: {
        rateBasedStatement: {
          limit: 2000,
          aggregateKeyType: 'IP',
        },
      },
      action: { block: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'RateLimitRule',
        sampledRequestsEnabled: true,
      },
    },
  ],
});
```

### 3. Enable Container Insights

```typescript
const cluster = new ecs.Cluster(this, 'RestAnalyserCluster', {
  vpc,
  containerInsights: true, // Change to true
});
```

### 4. Use Secrets Manager

Store sensitive config:

```bash
aws secretsmanager create-secret \
  --name rest-analyser/config \
  --secret-string '{"apiKey":"your-secret-key"}'
```

### 5. Enable ALB Access Logs

```typescript
const logBucket = new s3.Bucket(this, 'AlbLogBucket', {
  encryption: s3.BucketEncryption.S3_MANAGED,
});

alb.logAccessLogs(logBucket);
```

## Support

For issues and questions:
- Check CloudWatch logs first
- Review AWS Cost Explorer for cost issues
- Check ECS service events for deployment issues

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [ECS Fargate Pricing](https://aws.amazon.com/fargate/pricing/)
- [EFS Pricing](https://aws.amazon.com/efs/pricing/)
- [CloudFront Pricing](https://aws.amazon.com/cloudfront/pricing/)
- [AWS Cost Calculator](https://calculator.aws/)
