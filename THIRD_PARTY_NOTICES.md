# Third-party notices

## Pokémon Champions Battle Data

比較用のポケモン画像、画像とShowdown IDの対応、ルール別バトル統計は [Pokémon Champions Battle Data](https://championsbattledata.com/) から提供されています。

SnapCropは利用者のブラウザから必要なデータを直接読み込み、提供元のHTTPキャッシュ指定に従います。これらの候補PNG、生のバトル統計、API一覧をGitHub Pages配布物へ同梱せず、独自の永続ミラーを作りません。ゲーム映像の撮影画像はこの提供画像と別に扱います。

- [API guide](https://championsbattledata.com/api_guide)
- [API usage rules](https://championsbattledata.com/api-rules/)

ポケモンの画像・名称等の権利は各権利者に帰属します。SnapCropのMITライセンスは、それらの権利を付与するものではありません。

## damage-calc-ja-layer

同梱の `data/pokemon-display-catalog.json` に含む表示名・別名・技・特性・持ち物・性格の日本語対応は、[damage-calc-ja-layer](https://github.com/suisui-swimmy/damage-calc-ja-layer) の表示APIと辞書から生成しています。画像やアートワークは取り込みません。参照コミット、翻訳の確認状態、生成元のハッシュは同JSONの `provenance` に記録します。未確認の翻訳は元の英語名を表示します。

## Pokémon Showdown

`data/pokemon-display-catalog.json` の識別子、進化、フォーム、メガシンカ、伝説区分の生成には、[Pokémon Showdown](https://github.com/smogon/pokemon-showdown) の `data/pokedex.ts` および `data/tags.ts` を使用しています。参照コミットとファイルハッシュは同JSONに記録し、元のライセンス文を [data/showdown-LICENSE.txt](data/showdown-LICENSE.txt) として同梱します。

The MIT License (MIT)

Copyright (c) 2011-2026 Guangcong Luo and other contributors http://pokemonshowdown.com/

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
