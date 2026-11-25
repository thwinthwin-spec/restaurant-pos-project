# Deploying Table & Thyme POS to AWS

AWS App Runner is closed to new customers, so this guide uses **Amazon ECS Express Mode** — the replacement AWS recommends. The existing `Dockerfile` packages React and Express into one container, so only one running service is needed.

**Cost note:** Fargate is not free. With 0.25 vCPU / 512 MB and one task, expect roughly **USD 10–15 per month**. Delete the service when you are done with the demo.

## Architecture

```text
GitHub push
  -> GitHub Actions (OIDC, no stored AWS keys)
  -> docker build -> Amazon ECR
  -> ECS Express Mode (Fargate + ALB + HTTPS URL)
  -> MongoDB Atlas
```

The Express server already serves the built React app from `client/dist`, so there is no separate frontend host and no `VITE_API_URL` to change.

---

## 1 — MongoDB Atlas

1. Create a free shared cluster and a database user.
2. Under **Network Access**, allow `0.0.0.0/0` (Fargate does not have a fixed egress IP with this setup).
3. Copy the connection string:

   ```text
   mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/restaurant_pos?retryWrites=true&w=majority
   ```

Keep it out of Git. It goes into SSM Parameter Store in the next step.

## 2 — Store secrets in SSM Parameter Store

Use **SecureString** parameters. Replace the region, account ID and placeholders before running these commands.

**PowerShell**

```powershell
aws configure set region ap-southeast-1

aws ssm put-parameter `
  --name /restaurant-pos/mongodb-uri `
  --type SecureString `
  --value "mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/restaurant_pos?retryWrites=true&w=majority"

$secret = node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
aws ssm put-parameter --name /restaurant-pos/jwt-secret --type SecureString --value $secret
```

The JWT secret must be at least 32 characters; the command above generates 96 hex characters.

## 3 — Create IAM roles

The JSON templates in `aws/` contain `<AWS_ACCOUNT_ID>` and `<AWS_REGION>` placeholders. Replace them with your own values before using them.

```powershell
# Task execution role: pull image, write logs, read the two SecureString parameters
aws iam create-role `
  --role-name ecsTaskExecutionRole `
  --assume-role-policy-document file://aws/ecs-execution-role-trust-policy.json

aws iam attach-role-policy `
  --role-name ecsTaskExecutionRole `
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam put-role-policy `
  --role-name ecsTaskExecutionRole `
  --policy-name ReadPosSecrets `
  --policy-document file://aws/ecs-ssm-secrets-policy.json

# Infrastructure role: lets Express Mode create the ALB, SSL cert, security groups, autoscaling
aws iam create-role `
  --role-name ecsInfrastructureRoleForExpressServices `
  --assume-role-policy-document file://aws/ecs-infrastructure-role-trust-policy.json

aws iam attach-role-policy `
  --role-name ecsInfrastructureRoleForExpressServices `
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSInfrastructureRoleforExpressGatewayServices
```

IAM roles are eventually consistent. If the first deploy fails with an assume-role error, wait about a minute and rerun the workflow.

## 4 — Create the GitHub OIDC role and ECR repository

```powershell
aws iam create-open-id-connect-provider `
  --url https://token.actions.githubusercontent.com `
  --client-id-list sts.amazonaws.com

aws iam create-role `
  --role-name github-actions-ecs `
  --assume-role-policy-document file://aws/github-oidc-trust-policy.json

aws iam put-role-policy `
  --role-name github-actions-ecs `
  --policy-name DeployPos `
  --policy-document file://aws/github-actions-policy.json

aws ecr create-repository --repository-name restaurant-pos
```

OIDC means GitHub Actions receives short-lived credentials. No AWS access keys are stored in the repository.

## 5 — Add GitHub repository variables

In the repo: **Settings → Secrets and variables → Actions → Variables → New repository variable**.

| Variable | Example value |
| --- | --- |
| `AWS_REGION` | `ap-southeast-1` |
| `AWS_GITHUB_ROLE_ARN` | `arn:aws:iam::123456789012:role/github-actions-ecs` |
| `ECS_EXECUTION_ROLE_ARN` | `arn:aws:iam::123456789012:role/ecsTaskExecutionRole` |
| `ECS_INFRASTRUCTURE_ROLE_ARN` | `arn:aws:iam::123456789012:role/ecsInfrastructureRoleForExpressServices` |
| `ECR_REPOSITORY` | `restaurant-pos` |
| `ECS_SERVICE` | `table-thyme-pos` |
| `ECS_CLUSTER` | `default` |
| `MONGODB_URI_PARAMETER` | `/restaurant-pos/mongodb-uri` |
| `JWT_SECRET_PARAMETER` | `/restaurant-pos/jwt-secret` |
| `CLIENT_ORIGIN` | leave empty for the auto-generated URL, or set a custom HTTPS domain later |

No GitHub secrets are needed because the sensitive values stay in SSM.

## 6 — Deploy

Push to `main` or open **Actions → Deploy to AWS ECS Express → Run workflow**.

The workflow:

1. Builds `Dockerfile` and pushes the image to ECR, tagged with the commit SHA.
2. Creates or updates the Express service. Health check: `/api/health`.
3. When `CLIENT_ORIGIN` is empty, deploys once more with the URL that ECS assigned. This fixes CORS/cookies for the generated endpoint automatically.
4. Prints the public URL in the workflow summary.

Verify:

- `<endpoint>/api/health` returns `200`.
- Open `<endpoint>`. On a fresh database you will see **Set up your restaurant** — create the first admin, restaurant name and tax rate.
- Sign in, open **Point of sale**, and confirm the menu loads.

## 7 — Seed demo data (optional)

To add 16 menu items and 53 sample orders to the **same Atlas database**, run locally with the Atlas URI. Never commit it.

**PowerShell**

```powershell
$env:MONGODB_URI = "mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/restaurant_pos?retryWrites=true&w=majority"
npm run seed
```

**macOS / Linux**

```bash
MONGODB_URI='mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/restaurant_pos?retryWrites=true&w=majority' npm run seed
```

Reload the deployed app. Reports will now have content.

## 8 — Add the live link to the portfolio

Once the endpoint is stable, add **Live demo ↗** to the matching card in `Portfolio_Thwin` and push that repo too.

## 9 — Clean up

Delete the Express service from the ECS console (or with the AWS CLI), then delete the ECR repository. Removing the SSM parameters and IAM roles is optional but keeps the account tidy.

## Notes

- Production cookies are `httpOnly`, `Secure` and `SameSite=None` — handled automatically by `NODE_ENV=production`.
- CSRF protection stays enabled.
- For a custom domain, add it through the Express service's custom-domain settings, then set `CLIENT_ORIGIN` to that HTTPS origin and rerun the workflow.
