# ── Use the account's default VPC ────────────────────────────────────────
# Deliberate choice: a custom VPC with public/private subnets, NAT gateway,
# etc. is the "correct" enterprise answer, but a NAT gateway alone costs
# more per month than this entire project's AWS Free Tier budget allows.
# The default VPC's single public subnet is the right tradeoff for a
# single EC2 box + one RDS instance -- revisit this if the project ever
# needs genuine network isolation (e.g. a private RDS subnet unreachable
# from the internet even in principle, not just via security group rules).

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ── Security groups ───────────────────────────────────────────────────────

resource "aws_security_group" "app_server" {
  name_prefix = "${var.project_name}-app-"
  description = "EC2 instance running NGINX + the app container via Docker Compose"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH -- narrow allowed_ssh_cidr before real use"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS -- once Lets Encrypt is set up (see Ansible playbook)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound -- needed for apt/npm/Docker Hub/Prisma engine downloads, SES/SMTP, Cloudinary, Razorpay API calls"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-app-sg" }
}

resource "aws_security_group" "database" {
  name_prefix = "${var.project_name}-db-"
  description = "RDS MySQL -- reachable ONLY from the app servers security group, never from the open internet"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "MySQL from the app server only"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.app_server.id] # NOT a cidr_block -- this is the actual isolation mechanism
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-db-sg" }
}

# ── RDS (MySQL, Free Tier) ────────────────────────────────────────────────

resource "aws_db_subnet_group" "default" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids # RDS requires subnets in 2+ AZs even for a single-AZ instance
}

resource "aws_db_instance" "mysql" {
  identifier     = "${var.project_name}-db"
  engine         = "mysql"
  engine_version = "8.0"
  instance_class = var.db_instance_class

  allocated_storage = 20 # GB -- at the edge of the Free Tier's 20GB limit; raising this starts incurring cost
  storage_type       = "gp2"

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.default.name
  vpc_security_group_ids = [aws_security_group.database.id]

  # Never publicly accessible -- the security group rule above is
  # necessary but not sufficient on its own; this flag is the second,
  # independent layer that keeps RDS off the public internet entirely,
  # not just firewalled.
  publicly_accessible = false

  # 0 disables automated backups entirely -- found via a real FreeTierRestrictionError
  # on `terraform apply`: my original assumption that 7-day retention was
  # "free within Free Tier" was wrong. Automated backups consume backup
  # storage that isn't covered the way this comment used to claim. Trade-off,
  # stated plainly: zero backups means zero recovery if the database is
  # lost or corrupted -- acceptable for a student project's test data, not
  # for real residents' data. Revisit this the moment that's no longer true.
  backup_retention_period = 0
  skip_final_snapshot     = true # acceptable for a student project; set false + provide final_snapshot_identifier once this holds real resident data
  deletion_protection     = false # same reasoning -- flip both of these once this is a real production tenant's data

  tags = { Name = "${var.project_name}-mysql" }
}

# ── EC2 instance ───────────────────────────────────────────────────────────

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical's official AWS account -- pinning the owner ID, not just filtering by name, is what stops a spoofed "ubuntu-looking" AMI from a malicious account being selected

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "app_server" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [aws_security_group.app_server.id]
  subnet_id               = data.aws_subnets.default.ids[0]

  root_block_device {
    volume_size = 20 # GB -- Free Tier allows up to 30GB of EBS
    volume_type = "gp3"
  }

  # Deliberately NO user_data script here -- provisioning (Docker install,
  # app deploy) is Ansible's job (infra/ansible/playbook.yml), not baked
  # into Terraform. Keeping "create the infrastructure" and "configure
  # what's running on it" as separate tools/steps means re-provisioning
  # software doesn't require destroying and recreating the EC2 instance.
  tags = { Name = "${var.project_name}-app-server" }
}

resource "aws_eip" "app_server" {
  instance = aws_instance.app_server.id
  domain   = "vpc"

  # This IP is what nip.io subdomains resolve against
  # (greenvalley.<this-ip>.nip.io) until a real domain is pointed here --
  # see Phase 1's tenant-resolution decision. An Elastic IP specifically
  # (not just the instance's default public IP) matters because it stays
  # stable across stop/start, which a plain public IP does not.
  tags = { Name = "${var.project_name}-eip" }
}
