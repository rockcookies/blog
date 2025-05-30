---
title: 打造 Windows 下优雅的 WSL 开发环境
description: 打造 Windows 下优雅的 WSL 开发环境
pubDate: 2023-06-20
lastModDate: ''
toc: true
share: true
giscus: true
ogImage: true
---

作为一个在 Windows 上写代码的开发者，你是不是也遇到过这样的痛点：想用 Linux 的命令行工具，但又舍不得 Windows 的软件生态？装双系统太麻烦，虚拟机又太重？

WSL（Windows Subsystem for Linux）就是为了解决这个问题而生的。经过几年的折腾，我总结了一套完整的 WSL 配置方案，让你在 Windows 上获得接近原生 Linux 的开发体验。

## 第一步：开启 WSL 功能

首先需要在 Windows 功能中开启 WSL。打开"控制面板 → 程序 → 启用或关闭Windows功能"，勾选"适用于 Linux 的 Windows 子系统"。

或者用管理员权限打开 PowerShell，执行：

```powershell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /noreboot
```

重启电脑后就可以安装 Linux 发行版了。

## 解决文件系统大小写问题

默认情况下，WSL 的文件系统是大小写不敏感的，这在编译某些项目时会出问题。我之前编译 OpenWrt 就栽过这个坑。

解决方法很简单，用管理员权限执行：

```bash
fsutil.exe file setCaseSensitiveInfo C:/Linux enable
```

这样就把 Linux 目录设置为大小写敏感了。

## 用 LxRunOffline 管理多个发行版

虽然微软商店提供了 Ubuntu、Debian 等发行版，但选择有限，而且不能自定义安装位置。LxRunOffline 这个工具能让你安装任意发行版到任意位置。

用 Scoop 安装最方便：

```bash
scoop bucket add extras
scoop install lxrunoffline
```

然后从[微软官方文档](https://docs.microsoft.com/en-us/windows/wsl/install-manual)下载你需要的发行版离线包，改后缀为 `.zip` 解压得到 `install.tar.gz`。

安装命令：

```bash
lxrunoffline i -n wsl-ubuntu -d C:/Linux/wsl-ubuntu -f D:/install.tar.gz
```

这样就把 Ubuntu 安装到了 `C:/Linux/wsl-ubuntu` 目录下。

## 创建普通用户

LxRunOffline 安装的系统默认用 root 登录，不太安全。我们创建一个普通用户：

```bash
# 创建用户
useradd -m -s /bin/bash username

# 设置密码
passwd username

# 添加到 sudo 组
usermod -aG sudo username

# 查看用户 ID
id -u username
```

然后在 PowerShell 中设置默认用户：

```bash
lxrunoffline su -n wsl-ubuntu -v 1000
```

## 换源提速

Ubuntu 默认的源在国内访问比较慢，换成阿里云的源：

```bash
# 备份原文件
sudo cp /etc/apt/sources.list /etc/apt/sources.list.bak

# 编辑源列表
sudo vim /etc/apt/sources.list
```

把内容替换为：

```txt
deb http://mirrors.aliyun.com/ubuntu/ jammy main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu/ jammy-security main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu/ jammy-updates main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu/ jammy-backports main restricted universe multiverse
```

然后更新：

```bash
sudo apt-get update && sudo apt-get upgrade
```

## 配置 WSL 行为

WSL 默认会把 Windows 的 PATH 合并过来，导致环境变量很乱。创建配置文件解决：

```bash
sudo vim /etc/wsl.conf
```

内容：

```ini
# 不加载 Windows 的 PATH
[interop]
appendWindowsPath = false

# 自动挂载 Windows 磁盘
[automount]
enabled = true
```

保存后重启 WSL：

```bash
wsl --terminate wsl-ubuntu
```

现在环境就干净多了。

## 网络代理配置

如果你需要通过代理上网，可以这样设置：

```bash
export http_proxy=http://127.0.0.1:1080
export https_proxy=http://127.0.0.1:1080
```

建议把这两行加到 `~/.bashrc` 或 `~/.zshrc` 中。

## SSH 解决中文乱码

SSH 连接其他服务器时可能出现中文乱码，编辑配置文件：

```bash
sudo vim /etc/ssh/ssh_config
```

把 `SendEnv LANG LC_*` 这行注释掉：

```
# SendEnv LANG LC_*
```

## 剪切板互通

要让 WSL 和 Windows 的剪切板互通，需要安装 win32yank：

```bash
curl -sLo/tmp/win32yank.zip https://github.com/equalsraf/win32yank/releases/download/v0.0.4/win32yank-x64.zip
unzip -p /tmp/win32yank.zip win32yank.exe > /tmp/win32yank.exe
chmod +x /tmp/win32yank.exe
sudo mv /tmp/win32yank.exe /usr/local/bin/
```

这样在 Vim/Neovim 中就能直接和 Windows 剪切板交互了。

## 小结

经过这一番配置，你就拥有了一个功能完整的 Linux 开发环境，而且：

- 启动速度比虚拟机快
- 文件系统与 Windows 互通
- 剪切板共享
- 网络配置简单
- 可以同时使用 Windows 和 Linux 软件

虽然配置过程有点繁琐，但一次配置终身受益。对于需要跨平台开发的程序员来说，WSL 绝对是最优雅的解决方案。
