terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local state for a single-operator student project -- deliberately not
  # an S3 remote backend. Remote state matters once multiple people or CI
  # runs `terraform apply`, which locks against concurrent modification;
  # for one person on one machine it's overhead with no payoff. Worth
  # switching to an S3 backend the moment a second person touches this.
}

provider "aws" {
  region = var.aws_region
}
