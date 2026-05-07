# Dashboard Juninhos · Censo & Banco de Ideias

Dashboard web 100% client-side para visualizar o censo da comunidade Juninhos, explorar o banco de ideias e organizar quem vai para qual projeto.

Sem backend, sem build, sem dependências locais — basta abrir o `dashboard.html` no navegador.

## Funcionalidades

### Visão Geral
Cards de resumo (respostas, ideias propostas, disponibilidade em maio, alocações feitas) e 7 gráficos: nível de experiência, horas/semana, GitHub, áreas de atuação, top tecnologias mencionadas (com normalização de aliases tipo `js` → JavaScript, `nodejs` → Node.js), estágio das ideias e preferência de trabalho em grupo.

### Pessoas
Tabela completa com 8 filtros independentes:
- Busca livre (nome, email, ideia, descrição)
- Nível, área, tecnologia (texto livre)
- Horas/semana, experiência GitHub
- Preferência de trabalho, disponibilidade em maio

Mostra também em quais ideias cada pessoa já foi alocada.

### Banco de Ideias
Grid de cards com todas as ideias propostas (filtro automático remove títulos-placeholder como "Sem ideia, quero ajudar", "Não tenho", etc).

Cada card tem botão **"Alocar equipe →"** que leva direto para a aba de organização da equipe.

### Ideias & Equipes
- Lista clicável de ideias à esquerda (com contador de membros alocados)
- Detalhes completos da ideia selecionada
- Coluna de **Equipe**: pessoas já alocadas, com botão de remover e atalho para adicionar o(a) autor(a)
- Coluna de **Candidatos**: mesmos 8 filtros + 2 toggles ("Só topa ajudar", "Só sem alocação"), cards com botão "+ Adicionar"

### Persistência e portabilidade
- Alocações salvas no `localStorage` do navegador (não somem ao recarregar)
- **Exportar alocações**: gera um JSON com nome, email, telefone e ideia de cada pessoa alocada
- **Importar alocações**: aceita o JSON exportado e oferece substituir ou mesclar com as alocações atuais (deduplica emails)

## Como usar

1. Clone ou baixe esta pasta
2. Abra `dashboard.html` no navegador (duplo clique)
3. Clique em **Carregar CSV** e selecione o arquivo do censo
4. Navegue pelas abas para explorar e alocar equipes

> Recomendado abrir via servidor local (ex: `python -m http.server` ou extensão Live Server) se for usar com diferentes CSVs em workflow.

## Estrutura

```
.
├── dashboard.html   # Estrutura HTML e tabs
├── styles.css       # Estilos (tema escuro, responsivo)
├── app.js           # Lógica: parse, filtros, gráficos, alocações
└── *.csv            # Dados do censo (não versionar dados sensíveis)
```

## Stack

- HTML / CSS / JavaScript puro (sem framework)
- [PapaParse](https://www.papaparse.com/) — parsing de CSV
- [Chart.js](https://www.chartjs.org/) — gráficos
- LocalStorage — persistência das alocações

Ambas as libs vêm via CDN, então não há `npm install`.

## Formato do CSV esperado

O CSV deve ter cabeçalho na primeira linha com (pelo menos) estas colunas:

| Coluna |
|---|
| Carimbo de data/hora |
| Nome de usuário |
| Qual é o seu nome? |
| Qual é o seu nível? |
| Em qual(is) área(s) você atua ou está aprendendo? |
| Quais tecnologias / linguagens você usa no dia a dia? |
| Qual é o seu nível de experiência com GitHub? |
| Quantas horas por semana você consegue dedicar a um projeto atualmente? |
| Qual é o nome ou título da sua ideia? |
| Descreva a ideia em até 3 frases. Que problema ela resolve? |
| Qual é o estágio atual da ideia? |
| Como você prefere trabalhar em grupo? |
| Você toparia ajudar outros membros com as ideias deles? |
| Tem disponibilidade para realizar trabalho em grupo no mês de maio? |

Áreas e checkboxes múltiplos são separados por `;` (formato padrão do Google Forms).

## Privacidade

Tudo roda no seu navegador. Nenhum dado é enviado para servidores externos — o CSV é processado localmente e as alocações ficam no `localStorage`.

Recomenda-se **não** versionar arquivos CSV com dados pessoais (emails, telefones) no repositório público. Adicione ao `.gitignore`:

```
*.csv
```
