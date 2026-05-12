# Enterprise IT Dataflow Studio

Интерактивная карта классов решений enterprise IT с knowledge-layer и поиском.

## Сборка базы знаний

```bash
node scripts/build-knowledge.mjs
```

Генерирует `enterprise-it-dataflow-knowledge.js` (короткий индекс), `kb/sheets/*.json` (полные листы, lazy-load) и `kb/research-corpus.txt`.

## Smoke-тесты (CI)

```bash
node scripts/smoke.mjs
```

## Открыть в браузере

После включения GitHub Pages: `https://<owner>.github.io/enterprise-it-dataflow-studio/`

