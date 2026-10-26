# Secret Theorems — 5×5 Browser Game

GitHub Pages でそのまま公開できる、サーバ不要の静的Web版です。

## ルール
- 5×5 点格子
- L型 / I型の3点ピースのみ
- 公開されたピースは両者共有
- closure の色マーカーは置かない
- 「証明します」と宣言して、公開済み定理を順に使い導出を提示
- 誤申告ペナルティなし
- デフォルト：対角の角L（3点）
- オプション：対角2×2（4点）

## GitHub Pagesで公開
1. GitHubで新規リポジトリを作成
2. `index.html`, `style.css`, `game.js` をリポジトリ直下に置く
3. Settings → Pages → Deploy from a branch
4. `main` / `(root)` を選ぶ

## 対戦方式
現在は1台の端末で交互に遊ぶ pass-and-play です。GitHub Pages は静的ホスティングなので、遠隔リアルタイム同期は含めていません。
