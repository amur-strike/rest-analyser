#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RestAnalyserStack } from '../lib/rest-analyser-stack';

const app = new cdk.App();

new RestAnalyserStack(app, 'RestAnalyserStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'REST Endpoint Analyser - Cost-effective deployment with ECS Fargate, S3, and CloudFront',
});

app.synth();
