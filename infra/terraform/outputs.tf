output "ec2_public_ip" {
  description = "Elastic IP -- use this to build your nip.io subdomains (e.g. greenvalley.<this-ip>.nip.io)"
  value       = aws_eip.app_server.public_ip
}

output "rds_endpoint" {
  description = "RDS connection endpoint -- goes into DATABASE_URL in your .env (never commit the resulting connection string)"
  value       = aws_db_instance.mysql.endpoint
}

output "ssh_command" {
  description = "Convenience: the exact command to SSH in, so you don't have to reassemble it by hand"
  value       = "ssh -i /path/to/${var.key_pair_name}.pem ubuntu@${aws_eip.app_server.public_ip}"
}

output "ansible_inventory_line" {
  description = "Paste this into infra/ansible/inventory.ini in place of the placeholder IP"
  value       = "${aws_eip.app_server.public_ip} ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/${var.key_pair_name}.pem"
}
