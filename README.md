# Traço & História

Aplicativo pessoal de desenho e criação de quadrinhos feito em React para uso simples em computador, tablet e celular.

## O que já está pronto

- editor de desenho com Fabric.js;
- lápis, pincel, marcador, borracha, linha, seta e formas;
- texto editável com fonte, tamanho, cor, negrito, itálico e alinhamento;
- seleção com alças para mover, redimensionar e girar;
- duplicar, copiar, colar, excluir, bloquear, ordenar e ocultar elementos;
- histórico de desfazer/refazer, zoom, encaixe e snap em grade;
- painel de camadas;
- upload seguro de PNG, JPG e WebP, compressão automática e recorte;
- editor de quadrinhos separado, com páginas reorganizáveis;
- layouts de 1, 2, 3, 4 e 6 quadros;
- balões de fala, pensamento, grito e caixa de narração;
- efeitos como BOOM, POW e texto personalizado;
- galeria separada entre desenhos e quadrinhos;
- cache e recuperação local com IndexedDB;
- autosave com debounce de 1,5 segundo;
- Supabase Database, Storage privado, RLS e miniaturas automáticas;
- pesquisa de exatamente três imagens reais pelo Wikimedia Commons;
- exportação de desenho em PNG/JPG, página em PNG e HQ completa em PDF;
- interface responsiva com barra inferior no celular.

## Arquitetura

```text
React + Fabric.js
├── IndexedDB: rascunho imediato e recuperação local
├── Supabase Database: projetos permanentes
├── Supabase Storage: uploads, imagens pesquisadas e thumbnails
└── Edge Function search-images: Wikimedia Commons
```

As chaves privadas nunca entram no frontend. O navegador recebe apenas a chave publicável do Supabase; cada projeto e arquivo é protegido por `auth.uid()` nas políticas RLS.

## Configuração do Supabase

No projeto Supabase conectado, o banco, o bucket privado, as políticas RLS, o acesso anônimo e a Edge Function de pesquisa já foram configurados.

Ao instalar o código em outro projeto Supabase, ative o acesso anônimo no painel:

### 1. Ativar o acesso anônimo

1. Abra `Authentication` → `Providers`.
2. Entre em `Anonymous Sign-Ins`.
3. Ative a opção e salve.

Sem isso, o aplicativo continua funcionando em modo local, mas não sincroniza com a nuvem.

## Rodar no computador

Requer Node.js 22 ou mais recente.

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal.

## Verificações

```bash
npm run lint
npm test
npm run build
```

Com o Supabase ativo, o teste online completo pode ser executado com:

```bash
node --env-file=.env src/test/supabase-smoke.mjs
```

Ele valida autenticação anônima, RLS e exatamente três resultados de pesquisa, removendo o projeto temporário ao terminar.

## Publicar na Netlify

1. Envie o projeto para um repositório no GitHub.
2. Na Netlify, escolha `Add new site` → `Import an existing project`.
3. Comando de build: `npm run build`.
4. Pasta de publicação: `dist`.
5. Publique.

As variáveis públicas do Supabase já estão no arquivo `.env`.

## Observações importantes

- A pesquisa gratuita permite 60 pedidos a cada 24 horas e mostra origem/licença quando disponível.
- Personagens conhecidos podem ser usados como referência pessoal, mas isso não concede direitos comerciais.
- O acesso anônimo fica ligado ao navegador. Se os dados do navegador forem apagados, o rascunho local e o acesso à identidade anônima podem ser perdidos. Os arquivos continuam protegidos no Supabase, mas recuperar a mesma identidade exigiria futuramente adicionar uma conta permanente.
