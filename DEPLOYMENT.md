# Deployment Runbook
## Society Management SaaS Platform — Phase 12

This is the order of operations, start to finish, on a fresh AWS account with nothing provisioned yet. Each tool does exactly one job — skipping ahead or running them out of order is the most common way this class of setup breaks.

---

## What each tool actually does (read this before running anything)

| Tool | Job | Runs |
|---|---|---|
| **Terraform** | Creates infrastructure: the EC2 instance, RDS database, security groups, Elastic IP | Once, and again only when infrastructure itself changes |
| **Ansible** | Configures that infrastructure: installs Docker, clones the repo, writes `.env`, does the first deploy | Once for initial setup; re-run only for server-level changes (new secrets, OS packages) |
| **Docker / Compose** | Builds and runs the actual application containers | Every deploy, triggered by Ansible (first time) or CI/CD (every push after) |
| **GitHub Actions** | Tests every push, deploys to the already-provisioned server on merge to `main` | Every push/PR |

If you run CI/CD before Ansible has ever provisioned the server, it'll fail — there's no `/opt/society-saas` for it to `git pull` into yet.

---

## Step 1 — Terraform: provision the infrastructure

```bash
cd infra/terraform

# Create an EC2 key pair first, in the AWS Console (EC2 > Key Pairs) --
# Terraform deliberately does not generate one, so the private key never
# has to touch this repo or Terraform's state file.

cat > terraform.tfvars <<EOF
key_pair_name    = "your-key-pair-name"
db_password      = "a-real-strong-password-here"
allowed_ssh_cidr = "YOUR_IP/32"   # find yours: curl ifconfig.me
EOF
# terraform.tfvars should be in .gitignore -- it will contain your DB password.

terraform init
terraform plan    # read this before applying -- confirms what will actually be created
terraform apply
```

Save the outputs — you need all three for the next steps:
```bash
terraform output ec2_public_ip
terraform output rds_endpoint
terraform output ansible_inventory_line
```

**What this validates on its own:** this project's Terraform files were checked with `terraform-config-inspect` during development (real `terraform validate` needs AWS provider registry access this environment didn't have) — confirmed 6 resources, 3 data sources, 9 variables, 4 outputs, zero structural errors. Run `terraform validate` yourself after `terraform init` for the full check, including against the actual AWS provider schema.

---

## Step 2 — Ansible: provision the server

```bash
cd infra/ansible

# Paste the ansible_inventory_line output from Step 1 into inventory.ini,
# replacing the placeholder.

# Create the vault file for secrets -- everything env.j2 references that
# isn't infrastructure-derived (JWT secrets, Cloudinary keys, SMTP creds):
ansible-vault create group_vars/all/vault.yml
# Inside, at minimum:
#   jwt_access_secret: "<openssl rand -hex 64>"
#   jwt_refresh_secret: "<a DIFFERENT openssl rand -hex 64>"
#   db_username: app_admin          # matches your terraform.tfvars
#   db_password: "..."              # matches your terraform.tfvars
#   rds_endpoint: "..."              # from terraform output rds_endpoint
#   db_name: society_saas
#   cloudinary_cloud_name: "..."
#   cloudinary_api_key: "..."
#   cloudinary_api_secret: "..."
#   smtp_host: "..."
#   smtp_user: "..."
#   smtp_pass: "..."

ansible-playbook -i inventory.ini playbook.yml \
  --ask-vault-pass \
  -e git_repo_url=https://github.com/you/your-repo.git
```

**What this validates on its own:** the playbook was run through both `ansible-playbook --syntax-check` and `ansible-lint` at the strictest ("production") profile during development. Three real issues were caught and fixed this way — a deprecated module, and two `become`/`changed_when` correctness issues that don't fail loudly but cause unpredictable behavior in edge cases. Zero violations remain.

---

## Step 3 — Point DNS at the Elastic IP (or skip, using nip.io)

**No domain yet (Phase 1's decision):** nothing to do here. `greenvalley.<ec2_public_ip>.nip.io` already resolves correctly — nip.io is a public wildcard DNS service, no configuration needed on your end.

**Once you have a real domain:** point a wildcard A record (`*.yourdomain.com`) at the Elastic IP from Step 1's output.

---

## Step 4 — HTTPS (optional but recommended before real residents use this)

Uncomment the certbot tasks at the bottom of `infra/ansible/playbook.yml`, set `domain_name` and `admin_email` as extra vars, and re-run the playbook. nip.io domains genuinely work with Let's Encrypt's HTTP-01 challenge (they resolve publicly to your IP, which is all the challenge needs) — you don't have to wait until you own a real domain to get real HTTPS.

---

## Step 5 — GitHub Actions: wire up ongoing deploys

In your repo's **Settings → Secrets and variables → Actions**, add:
- `EC2_HOST` — the Elastic IP
- `EC2_SSH_PRIVATE_KEY` — full contents of your `.pem` key pair file

Every push to `main` now: runs the 23 backend unit tests + a full frontend production build (both blocking — a broken build never reaches deploy), then SSHes in and runs `git pull && docker compose up -d --build`.

**What this validates on its own:** the workflow YAML was parsed and confirmed structurally valid during development. (One thing worth knowing, not a bug: `on:` appears to vanish when parsed with a strict YAML 1.1 parser like Python's PyYAML, because bare `on`/`off`/`yes`/`no` are interpreted as booleans — this is a well-known quirk every GitHub Actions workflow ever written triggers, and GitHub's own parser explicitly special-cases it. Nothing to fix.)

---

## Honest gaps — what running this for real will surface that I couldn't test

Every piece here was tested as far as this environment's network policy allowed — real MariaDB runs, real Ansible lint at the strictest profile, real NGINX config validation, real `docker compose config` resolution. Two things were **not** testable here, specifically because their required hosts (`binaries.prisma.sh` for the Prisma engine, `registry-1.docker.io` for pulling base images) are blocked by this sandbox's network policy — confirmed directly, not assumed:

1. **A full `docker build` of either image** — the Dockerfiles are written carefully and follow standard, well-established multi-stage patterns, but have never actually produced a running container. The first real build (on your machine, or in CI) is where you'd find anything like a missed `COPY` path or an alpine-vs-glibc native-module issue (e.g. `bcrypt` sometimes needs a rebuild on Alpine — if `npm ci` fails in the builder stage on this specifically, swap `bcrypt` for `bcryptjs`, a pure-JS drop-in with an identical API, which sidesteps the issue entirely).
2. **The actual `terraform apply` against real AWS** — structurally validated, never applied. The first real `apply` is where you'd catch anything like a region-specific AMI availability issue or an account-level Free Tier eligibility quirk that only AWS's own API can tell you about.

Both are normal, expected gaps for infrastructure code that's never touched real infrastructure — not a reason to distrust the rest of what's been validated here for real.
