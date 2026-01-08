# 在线留言板

一个基于 Cloudflare Workers 和 D1 数据库的在线留言板应用。

## 功能特性

- **留言提交**: 用户可以提交留言，包含名字和内容。
- **图片上传**: 支持上传图片或直接调用摄像头拍照上传。
- **分页显示**: 留言列表分页显示，每页 10 条留言。
- **留言删除**: 支持删除特定的留言。
- **智能时间**: 显示留言的创建时间（格式化为 YYYY-MM-DD HH:mm:ss）。
- **数据存储**: 基于 Cloudflare D1 数据库存储文本和图片数据。
- **安全防护**: 防 XSS 攻击，内容长度限制，图片大小限制。

## 技术栈

- **前端**: HTML + CSS (Tailwind CSS CDN) + JavaScript
- **后端**: Cloudflare Workers
- **数据库**: Cloudflare D1 (SQLite)
- **部署**: Cloudflare Workers

## 项目结构

```
web_message/
├── src/
│   └── index.js        # Cloudflare Workers 主文件 (后端逻辑)
├── index.html          # 前端页面
├── schema.sql          # 数据库表结构
├── wrangler.toml       # Cloudflare Workers 配置文件
├── package.json        # 项目依赖配置
└── README.md           # 说明文档
```

## 部署步骤

### 1. 环境准备

确保你已经安装了 Node.js (推荐 18.x 或更高版本)。

```bash
npm install
```

### 2. 登录 Cloudflare

```bash
npx wrangler login
```
这会打开浏览器让你登录到 Cloudflare 账户。

### 3. 创建 D1 数据库

```bash
npx wrangler d1 create message-board-db
```

执行后，命令会返回数据库的 ID，请记录下这个 ID。

### 4. 配置 wrangler.toml

打开 `wrangler.toml` 文件，将 `database_id` 替换为上一步生成的 ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "message-board-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # 替换为实际的 ID
```

### 5. 初始化数据库

执行 SQL 脚本创建数据库表（包含留言表结构）：

**本地开发环境：**
```bash
npm run d1:init:local
# 或者
npx wrangler d1 execute message-board-db --local --file=./schema.sql
```

**生产环境（Cloudflare）：**
```bash
npm run d1:init
# 或者
npx wrangler d1 execute message-board-db --remote --file=./schema.sql
```

### 6. 本地开发测试

启动本地开发服务器：

```bash
npm run dev
```
访问 `http://localhost:8787` 查看应用。

### 7. 部署到 Cloudflare

```bash
npm run deploy
```

部署成功后，控制台会输出应用的访问 URL。

## 常用命令

```bash
# 本地开发
npm run dev

# 部署到生产环境
npm run deploy

# 初始化远程数据库
npm run d1:init

# 初始化本地数据库
npm run d1:init:local

# 查询远程数据库
npm run d1:query -- "SELECT * FROM messages"

# 查询本地数据库
npm run d1:query:local -- "SELECT * FROM messages"
```

## 自定义配置

### 修改每页显示数量

在 `src/index.js` 中修改 `limit` 变量：

```javascript
const limit = 10; // 修改为你想要的数量
```

### 修改图片大小限制

在 `src/index.js` 中修改大小判断逻辑：

```javascript
if (imageFile.size > 5 * 1024 * 1024) { // 5MB limit
  // ...
}
```

## 注意事项

- **图片存储**: 图片目前直接以 BLOB 形式存储在 D1 数据库中。对于大量或大尺寸图片，建议迁移到 Cloudflare R2 存储。
- **安全性**: 虽然有基本的防 XSS 和验证，但在生产环境中建议增加更严格的限流和验证机制。

## License

MIT
