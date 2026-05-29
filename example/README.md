# TVTrash Infrastructure

This directory contains the **Infrastructure as Code (IaC)** configuration for
deploying the TVTrash application using **Terraform**.

It manages the deployment of:

- **Supabase** project configuration (via `supabase` provider)
- **Render** services for the frontend and other services (via `render`
  provider)

## 🏗 Architecture

The infrastructure is defined using **Terraform** and manages the state remotely
(currently configured for `TFState.dev`).

## 📋 Prerequisites

Before running any Terraform commands, ensure you have the following:

1. **GitHub Token**: A `read-access` token for the repository.
    - `export TF_HTTP_PASSWORD="<github-token>"`
2. **Render API Key**: From your
   [Render Account Settings](https://dashboard.render.com/u/settings#api-keys).
    - `export TF_VAR_render_api_key="<render-api-key>"`
3. **Supabase Access Token**: From your
   [Supabase Account](https://app.supabase.com/account/tokens).
    - `export TF_VAR_supabase_access_token="<supabase-access-token>"`

## 🚀 Usage

### 1. Initialize Terraform

```bash
terraform init
```

### 2. Plan Changes

Review the changes that will be made to your infrastructure.

```bash
terraform plan
```

### 3. Apply Changes

Apply the changes to deploy/update the infrastructure.

```bash
terraform apply
```
