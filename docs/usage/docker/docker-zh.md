# 在 Docker 中使用 lark-mcp (Alpha)

本文档将介绍如何构建并运行官方 lark-mcp Docker 镜像，内置 keytar 安全存储，开箱即用。

[English Version](./docker.md)

## 前置条件
- 已安装 Docker Desktop（或任意 Docker 运行时）
- 拥有你的飞书/Lark 应用 App ID 和 App Secret

## 1）构建镜像
```bash
# 在项目根目录执行
docker build -t lark-mcp:latest .
```

## 2）快速检查
- 查看帮助
```bash
docker run --rm -it lark-mcp:latest --help
```
- 查看登录状态（会初始化存储）
```bash
docker run --rm -it lark-mcp:latest whoami
```


## 3）MCP 客户端配置

启动Docker容器后，还需要在MCP客户端中进行相应配置才能使用。

### stdio 模式配置

如果使用默认的stdio模式，在MCP客户端（如Cursor）配置文件中添加：

```json
{
  "mcpServers": {
    "lark-mcp": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "lark_mcp_data:/home/node/.local/share/lark-mcp",
        "lark-mcp:latest", "mcp",
        "-a", "your_app_id",
        "-s", "your_app_secret"
      ]
    }
  }
}
```

### streamable 模式配置

如果使用streamable（HTTP）模式，需要先启动容器：

```bash
docker run --rm -it \
  -p 3000:3000 \
  -v lark_mcp_data:/home/node/.local/share/lark-mcp \
  lark-mcp:latest mcp -a <your_app_id> -s <your_app_secret> -m streamable --host 0.0.0.0 -p 3000
```

然后在MCP客户端配置文件中添加：

```json
{
  "mcpServers": {
    "lark-mcp": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### 用户身份配置（OAuth）

如需使用用户身份访问个人数据，在Docker环境中目前仅支持 stdio 模式：

> ⚠️ **重要提示**：在Docker环境中，streamable 模式暂不支持 OAuth，请使用 stdio 模式进行用户身份验证。

#### stdio 模式 + OAuth

stdio模式需要先进行OAuth登录：

1. **预先登录获取用户令牌**：
```bash
docker run --rm -it \
  -p 3000:3000 \
  -v lark_mcp_data:/home/node/.local/share/lark-mcp \
  lark-mcp:latest login -a <your_app_id> -s <your_app_secret> --host 0.0.0.0
```

2. **MCP客户端配置**：
```json
{
  "mcpServers": {
    "lark-mcp": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "lark_mcp_data:/home/node/.local/share/lark-mcp",
        "lark-mcp:latest", "mcp",
        "-a", "your_app_id",
        "-s", "your_app_secret",
        "--oauth", "--token-mode", "user_access_token"
      ]
    }
  }
}
```

## 提示
- 无需输入密码：容器内已自动初始化 secrets 服务，keytar 无需交互即可安全存储令牌。
- 持久化令牌：建议始终挂载 `lark_mcp_data` 数据卷。
