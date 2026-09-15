# fork元(jordanhubbard/webmux)との差分

このリポジトリ(`de-ataka/webmux`)は [jordanhubbard/webmux](https://github.com/jordanhubbard/webmux) からフォークしたプロジェクトです。フォーク後の分岐点(`7012e86` / v1.3.10 リリース時点)以降にこのフォーク独自で加えた変更をまとめます。

> **Note:** 本フォークは fork元とは目的が分岐しているため、`CLAUDE.md` のルールにより、明示的な指示がない限り fork元(`jordanhubbard/webmux`)へ Pull Request は送りません。すべての PR は `origin`(`de-ataka/webmux`)を対象とします。

## 機能追加

### 保存ホストに表示名を設定できる

接続先の一覧が生ID/IPのままだと見分けづらかったため、`HostEntry` に任意の表示名フィールド(日本語も可)を追加しました。設定すると保存ホストのカードに `名前 (user@host)` の形式で表示され、未設定時は従来通りの表記にフォールバックします。SSH/VNC/RDP のどのダイアログでも共通の仕組みです。

### SSH タブのタイトルに保存ホストの表示名を付与

保存ホストから起動したセッションでは、上記の表示名が設定されている場合にタブタイトルの先頭にその名前を付けます(例: `Prod DB:user@host`)。表示名が未設定の場合は従来通り `user@host` のみです。

### 保存ホストの接続情報を編集可能に

バックエンドには以前から `PUT /api/hosts/:id` が存在していましたが、フロントエンドから呼び出す手段がありませんでした。`ConnectionDialog` の各保存ホストカードに編集(鉛筆)ボタンを追加し、フォームを編集モードに切り替えて `api.updateHost` を呼べるようにしました。これにより保存ホストの追加・削除だけでなく編集も UI から行えます。

### `~/.ssh/config` からホストをインポート

`hosts.yaml` / `keys.yaml` を手書きする代わりに、サーバー側の `~/.ssh/config` に定義された `Host` エントリを接続ダイアログから選んでインポートできます。`HostName` / `Port` / `User` / `IdentityFile` を解析し(ワイルドカードパターンはスキップ)、インポート時に識別鍵ファイルごとの `Key` エントリと `Host` エントリをサーバー側で作成・再利用します。クライアント側は常にエイリアスを選ぶだけで済みます。

### `listen_host` の複数アドレス対応

`app.yaml` の `listen_host` に YAML のリスト、またはカンマ区切りの文字列を指定できるようになり、サーバーはエントリごとに HTTP/HTTPS のリスナーを1つずつバインドします。複数の listen アドレスに依存していた本番運用の設定を正式にサポートするための変更です。

## 修正

### ターミナル選択中の Ctrl+C はクリップボードへコピー

これまではマウスでターミナル出力を選択して Ctrl+C を押しても、xterm.js が常に pty へ Ctrl+C を転送していたため(実行中の `claude` プロセスなどに割り込んでしまう)、選択内容をクリップボードにコピーする手段がありませんでした。選択範囲がある場合は Ctrl+C でコピーし、選択がない場合は従来通り SIGINT を送るようにし、多くのターミナルアプリの慣習に合わせました。

### `sshConfigParser` テストの OS 依存を解消

Windows の CI ジョブは `path.join`(ネイティブの `\` 区切り)で `identityFile` を組み立てますが、テスト側はフォワードスラッシュ区切りのパスをハードコードしていたため POSIX でしか通りませんでした。テスト側も `path.join` でパスを組み立てるように修正しました。

## CI / ドキュメント

- macOS パッケージングの CI ランナーを `macos-14` から `macos-15` に変更(`macos-14` は Homebrew のサポートマトリクスで Tier 3 となり、プリビルドの bottle が提供されず毎回 llvm / node@24 のソースビルドが発生し、さらに node@24 のソースビルド自体が古いツールチェーンではコンパイルエラーになっていたため)。
- `CLAUDE.md` に、fork元(`jordanhubbard/webmux`)へは明示的な指示がない限り PR を送らない旨のルールを追記。

## 関連ドキュメント

- [PROVENANCE.md の Part 5](../README.md#the-totally-true-and-not-at-all-embellished-history-of-webmux) — WebMux 自体の由来
- [packaging.md](packaging.md) — パッケージングとリリース手順
- [agent-views.md](agent-views.md) — オプションのエージェントビュー機能
