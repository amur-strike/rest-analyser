# AWS CDK Deployment Guide

This directory contains AWS CDK infrastructure code for deploying the REST Endpoint Analyser to AWS using cost-effective services.

## Architecture

### Cost-Optimized Components:

1. **Frontend**: S3 + CloudFront
   - Static files hosted on S3
   - Global CDN with CloudFront
   - Cost: ~$1-5/month for low traffic

2. **Backend**: ECS Fargate
   - Containerized Node.js application
   - Minimal resources: 256 CPU, 512 MB RAM
   - Auto-scaling: 1-4 tasks
   - Cost: ~$15-30/month for low traffic

3. **Database**: EFS + SQLite
   - Persistent storage with EFS
   - Lifecycle policy moves data to IA after 30 days
   - Cost: ~$1-3/month for small databases

4. **Networking**: VPC + Single NAT Gateway
   - 2 Availability Zones
   - Single NAT Gateway (not HA but cheaper)
   - Cost: ~$32/month for NAT Gateway

5. **Load Balancer**: Application Load Balancer
   - WebSocket support
   - Cost: ~$20/month

**Total Estimated Cost**: $70-90/month for low-medium traffic

### Cost Optimization Features:

- ✅ Minimal Fargate task size (256 CPU, 512 MB RAM)
- ✅ Single NAT Gateway instead of multi-AZ
- ✅ EFS with Intelligent-Tiering
- ✅ CloudFront with Price Class 100 (NA/EU only)
- ✅ Auto-scaling with conservative limits
- ✅ Short CloudWatch log retention (7 days)
- ✅ S3 static hosting instead of EC2
- ✅ Container Insights disabled

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI installed and configured
3. Node.js 18+ installed
4. Docker installed (for building containers)

## Installation

1. Install CDK dependencies:
```bash
cd cdk
npm install
```

2. Bootstrap CDK (first time only):
```bash
npx cdk bootstrap
```

## Deployment

### Option 1: Basic Deployment (No Custom Domain)

```bash
# Build frontend
cd frontend
npm install
npm run build
cd ..

# Deploy infrastructure
cd cdk
npm install
npm run build
npx cdk deploy
```

### Option 2: Deployment with Custom Domain

First, create an SSL certificate in AWS Certificate Manager for your domain in `us-east-1` region (required for CloudFront).

Then modify the CDK app in `bin/rest-analyser.ts`:

```typescript
new RestAnalyserStack(app, 'RestAnalyserStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  domainName: 'analyser.yourdomain.com',
  certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/xxx',
  hostedZoneId: 'Z1234567890ABC', // Optional: for automatic Route53 setup
});
```

Then deploy:
```bash
npx cdk deploy
```

### Using the Deployment Script

```bash
chmod +x ../scripts/deploy.sh
../scripts/deploy.sh
```

## CDK Commands

- `npm run build` - Compile TypeScript
- `npm run watch` - Watch for changes
- `npm run cdk synth` - Synthesize CloudFormation template
- `npm run cdk diff` - Compare deployed stack with current state
- `npm run deploy` - Deploy stack to AWS
- `npm run destroy` - Destroy all resources

## Configuration

### Environment Variables

The backend container uses these environment variables:

- `NODE_ENV`: Set to "production"
- `PORT`: Container port (3001)
- `BASE_URL`: Your domain or CloudFront URL

### Fargate Task Sizing

To adjust resources, modify in `lib/rest-analyser-stack.ts`:

```typescript
const taskDefinition = new ecs.FargateTaskDefinition(this, 'RestAnalyserTaskDef', {
  memoryLimitMiB: 512,  // Change this
  cpu: 256,              // Change this
});
```

Valid combinations:
- 256 CPU: 512, 1024, 2048 MB
- 512 CPU: 1024-4096 MB
- 1024 CPU: 2048-8192 MB

### Auto-Scaling

Modify scaling parameters in `lib/rest-analyser-stack.ts`:

```typescript
const scaling = service.autoScaleTaskCount({
  minCapacity: 1,  // Minimum tasks
  maxCapacity: 4,  // Maximum tasks
});
```

## Cost Optimization Tips

### Further Reduce Costs:

1. **Use Fargate Spot** (not implemented by default):
   - Add capacity provider strategy
   - Can reduce costs by ~70%
   - Less reliability

2. **Reduce NAT Gateway costs**:
   - Use VPC Endpoints for AWS services
   - Consider NAT instances for very low traffic

3. **Schedule scaling**:
   - Scale down to 0 during off-hours
   - Use Lambda to adjust desired count

4. **Use S3 Intelligent-Tiering**:
   - Automatically moves objects to cheaper storage

5. **Set up CloudWatch alarms**:
   - Monitor costs
   - Alert on unusual spending

### Zero-Cost Development:

For development, use local Docker:

```bash
chmod +x ../scripts/local-docker.sh
../scripts/local-docker.sh
```

## Monitoring

### CloudWatch Logs

View logs:
```bash
aws logs tail /aws/ecs/rest-analyser --follow
```

### ECS Service

Check service status:
```bash
aws ecs describe-services \
  --cluster RestAnalyserCluster \
  --services RestAnalyserService
```

### Container Logs

Enable ECS Exec and connect:
```bash
aws ecs execute-command \
  --cluster RestAnalyserCluster \
  --task <task-id> \
  --container RestAnalyserContainer \
  --interactive \
  --command "/bin/sh"
```

## Troubleshooting

### Frontend not loading
- Check CloudFront distribution status
- Verify S3 bucket has files
- Check browser console for CORS errors

### Backend not responding
- Check ECS service status
- View CloudWatch logs
- Verify ALB health checks are passing
- Check security groups allow traffic

### Database errors
- Verify EFS mount succeeded
- Check EFS security group rules
- Ensure task role has EFS permissions

### High costs
- Check number of running tasks
- Review CloudWatch metrics
- Verify NAT Gateway traffic
- Check CloudFront data transfer

## Cleanup

To delete all resources:

```bash
cd cdk
npx cdk destroy
```

This will remove all infrastructure but preserve:
- CloudWatch logs (if retention > 0)
- EFS data (if RemovalPolicy is RETAIN)

## Security Considerations

For production deployment:

1. **Enable HTTPS**: Add SSL certificate
2. **Enable WAF**: Add AWS WAF to CloudFront
3. **Restrict access**: Add authentication
4. **Enable Container Insights**: Better monitoring
5. **Multi-AZ NAT**: Use NAT Gateway per AZ
6. **Enable deletion protection**: On ALB and other resources
7. **Use Secrets Manager**: For sensitive config
8. **Enable VPC Flow Logs**: For security auditing
9. **Set up backups**: Enable EFS backups

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [AWS Cost Optimization](https://aws.amazon.com/pricing/cost-optimization/)
