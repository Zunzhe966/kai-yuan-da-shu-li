# 开源大梳理 · security

## 密钥与加密

- [HashiCorp Vault](https://github.com/hashicorp/vault) — 密钥与动态凭证管理（与 devops/vault 同项目；安全视角收录）。
- [SOPS](https://github.com/getsops/sops) — 加密配置文件（YAML/JSON），可进 Git。
- [age](https://github.com/FiloSottile/age) — 简单现代的文件加密工具。
- [Gitleaks](https://github.com/gitleaks/gitleaks) — 检测仓库中的密钥泄漏。

## 漏洞/SCA/SBOM

- [Trivy](https://github.com/aquasecurity/trivy) — 容器/文件系统/仓库漏洞与误配扫描。
- [Grype](https://github.com/anchore/grype) — 基于 SBOM 的漏洞扫描器。
- [Syft](https://github.com/anchore/syft) — 生成 SBOM 的工具。
- [OSV-Scanner](https://github.com/google/osv-scanner) — 基于 OSV 的依赖漏洞扫描。
- [Gitleaks](https://github.com/gitleaks/gitleaks) — 检测仓库中的密钥泄漏。

## 静态应用安全

- [Semgrep](https://github.com/semgrep/semgrep) — 快速多语言静态规则扫描。
- [Bandit](https://github.com/PyCQA/bandit) — Python 安全问题静态检查。

## 供应链签名

- [Cosign](https://github.com/sigstore/cosign) — 容器/制品签名与验证（Sigstore）。
- [Fulcio](https://github.com/sigstore/fulcio) — Sigstore 证书颁发组件。

## 策略引擎

- [Open Policy Agent](https://github.com/open-policy-agent/opa) — 通用策略引擎（Rego）。
- [Kyverno](https://github.com/kyverno/kyverno) — Kubernetes 原生策略引擎。

## 身份认证

- [Keycloak](https://github.com/keycloak/keycloak) — 开源身份认证与访问管理。
- [Authentik](https://github.com/goauthentik/authentik) — 现代开源身份提供者。

## 主机与网络加固

- [Fail2Ban](https://github.com/fail2ban/fail2ban) — 根据日志封禁暴力破解来源。
- [WireGuard](https://github.com/WireGuard/wireguard-linux) — 现代高性能 VPN 协议实现。

