#!/bin/bash
# 一键部署"拾句"到 Cloudflare Pages
# 用法: bash deploy.sh
set -e
cd "$(dirname "$0")"

# 同步站点文件到 dist-site（排除临时文件）
rm -rf dist-site
mkdir -p dist-site
cp -r index.html css js data dist-site/

# 走本地代理部署（Clash 默认端口 7890，按需修改）
export HTTPS_PROXY=http://127.0.0.1:7890
export HTTP_PROXY=http://127.0.0.1:7890
wrangler pages deploy dist-site --project-name=shiju --branch=main --commit-dirty=true
