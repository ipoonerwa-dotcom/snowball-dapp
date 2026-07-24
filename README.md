# SNOWBALL 签约 DApp

Snowball 签约(固定期限 + 金本位奖励)前端。独立站,推 GitHub 后直接部署 Vercel。

- 技术栈:Next.js 16(App Router)+ React 19 + wagmi 3 / viem 2,纯 CSS(无 UI 框架)
- 链:BSC 主网(56)
- 风格:青色族玻璃风(`#04070f` 底 + teal/cyan/sky/indigo 渐变)

## 机制(与合约一一对应)

| 项 | 规则 |
|---|---|
| 期限 | 30 天(+10%)/ 60 天(+25%) |
| 奖励口径 | **金本位**:签约时按当时价把本金折成 USD,锁定 USD 奖励额度 |
| 每日结算 | keeper 每晚 12:00(北京时间)按 **5 分钟 TWAP** 把当日 USD 额度折成 SNOWBALL 记账 |
| 领取 | 逐日累积,随时可领(`claimReward`) |
| 本金 | **币本位**:存多少还多少,到期(时间判定,不依赖 keeper)`withdrawPrincipal` 取回 |
| 奖励池 | 社区注入 40,000 SNOWBALL,先到先得,发完即止;本金与奖励池分账,本金永远可取 |

## 本地开发

```bash
npm install
cp .env.example .env.local   # 填合约地址
npm run dev
```

## 环境变量

| 变量 | 说明 |
|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | 56(主网)/ 97(测试网) |
| `NEXT_PUBLIC_RPC` | BSC RPC 节点 |
| `NEXT_PUBLIC_TOKEN` | SNOWBALL 代币地址(已内置默认值) |
| `NEXT_PUBLIC_STAKING` | 签约合约地址(已内置主网默认值) |
| `NEXT_PUBLIC_ORACLE` | TWAP 预言机地址(已内置主网默认值) |
| `NEXT_PUBLIC_BUY_ROUTER` | 买入/邀请 buy-router 地址(已内置主网默认值) |
| `NEXT_PUBLIC_REWARD_POOL_TARGET` | 奖励池目标,仅用于进度展示(默认 40000) |
| `NEXT_PUBLIC_WC_PROJECT_ID` | 可选。不填则只支持钱包内置浏览器 / 插件钱包 |

未配置 `NEXT_PUBLIC_STAKING` / `NEXT_PUBLIC_ORACLE` 时,页面照常渲染并显示"合约待部署"提示,交互按钮禁用 —— 可以先上线站点,合约部署后补环境变量重新部署即可。

## Vercel 部署

1. 推到 GitHub;
2. Vercel 导入仓库,框架自动识别 Next.js,无需改构建命令;
3. 在 Project → Settings → Environment Variables 里按上表填入;
4. Deploy。

## 结构

```
src/
  app/          layout / page / globals.css / icon.svg
  components/   Header · Hero · StatsRow · SignSection(签约)· MyPositions(我的签约)
                EffectSteps(雪球效应)· ReferralSection(邀请,二期)· Footer · Art(品牌 SVG)
  lib/          config(env/地址)· abis · useSnowball(链上读)· format
```

## 二期(邀请板块)

买入返佣 + 团队等级(雪花 5% → 帝王 10%,团队业绩按 U 计)为第二期:需要 DApp 内买入路由合约做归因,链下算等级签发凭证。当前页面已留位,数据显示为 `—`。
