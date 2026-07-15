variable "aws_region" {
  description = "AWS region -- pick one close to your residents for latency, and check Free Tier eligibility varies slightly by region/account age"
  type        = string
  default     = "ap-south-1" # Mumbai -- closest to a Pune-based society
}

variable "instance_type" {
  description = "EC2 instance type -- t3.micro is Free Tier eligible on accounts created after 2021; use t2.micro if your account predates that"
  type        = string
  default     = "t3.micro"
}

variable "db_instance_class" {
  description = "RDS instance class -- db.t3.micro is Free Tier eligible (750 hrs/month for 12 months)"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "Initial database name created on the RDS instance"
  type        = string
  default     = "society_saas"
}

variable "db_username" {
  description = "Master username for RDS -- application connects with this OR a separate least-privilege user created after init (recommended, see README)"
  type        = string
  default     = "app_admin"
}

variable "db_password" {
  description = "Master password for RDS. NEVER commit a real value -- pass via terraform.tfvars (gitignored) or TF_VAR_db_password env var"
  type        = string
  sensitive   = true
}

variable "key_pair_name" {
  description = "Name of an EXISTING EC2 key pair for SSH access -- create one in the AWS Console first (EC2 > Key Pairs), Terraform does not generate it for you deliberately, so the private key never has to touch this repo or state file"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR allowed to SSH into the instance -- default is open to the world, which you should narrow to your own IP (e.g. \"203.0.113.5/32\") before applying in anything resembling production"
  type        = string
  default     = "0.0.0.0/0"
}

variable "project_name" {
  description = "Prefix used to tag and name every resource, so they're identifiable in the AWS Console"
  type        = string
  default     = "society-saas"
}
