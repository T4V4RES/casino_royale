# Casino Royale 3D — Projeto de ICG 2025/2026

> Aplicação Web 3D interactiva, desenvolvida em Three.js, que materializa conceitos nucleares de Introdução à Computação Gráfica (ICG) num cenário de casino virtual com três jogos funcionais.

![Versão](https://img.shields.io/badge/versão-1.0-blue)
![Licença](https://img.shields.io/badge/licença-Educational-green)
![Plataforma](https://img.shields.io/badge/plataforma-WebGL%2FThree.js-red)

---

## Índice

- [1. Enquadramento e objectivos](#1-enquadramento-e-objectivos)
- [2. Funcionalidades implementadas](#2-funcionalidades-implementadas)
- [3. Estrutura do projecto](#3-estrutura-do-projecto)
- [4. Mapeamento dos conteúdos leccionados](#4-mapeamento-dos-conteúdos-leccionados)
- [5. Fundamentos técnicos por unidade ICG](#5-fundamentos-técnicos-por-unidade-icg)
- [6. Utilização](#6-utilização)
- [7. Execução local](#7-execução-local)
- [8. Arquitectura de software](#8-arquitectura-de-software)
- [9. Desempenho e depuração](#9-desempenho-e-depuração)
- [10. Trabalho futuro](#10-trabalho-futuro)

---

## 1. Enquadramento e objectivos

O **Casino Royale 3D** foi concebido como projecto aplicado de ICG, com os seguintes objectivos académicos:

1. Demonstrar a utilização de uma *pipeline* gráfica moderna no browser (WebGL via Three.js).
2. Integrar transformação geométrica, visualização, iluminação e modelação por malhas poligonais.
3. Organizar uma base de código modular, legível e extensível.
4. Implementar interacção em primeira pessoa com estados de jogo bem definidos.

O resultado é um ambiente tridimensional navegável que inclui:
- **Blackjack**;
- **Roleta**;
- **Video Poker (5-card draw, variante Jacks or Better)**.

---

## 2. Funcionalidades implementadas

### 2.1 Ambiente tridimensional
- Sala interior de casino com piso, paredes, colunas e elementos decorativos.
- Mesas especializadas para cada jogo.
- Sinalética e objectos auxiliares (fichas, cartas, componentes da roleta).

### 2.2 Interacção e navegação
- Controlo em primeira pessoa com `PointerLockControls`.
- Movimento por teclado (`W`, `A`, `S`, `D`) e orientação por rato.
- Deteção de proximidade às mesas com indicação contextual de interacção.
- Transições suaves de câmara ao entrar e sair de cada mesa.

### 2.3 Lógica de jogo
- **Blackjack**: `deal`, `hit`, `stand`, `double down`, avaliação automática e pagamentos.
- **Roleta**: apostas múltiplas, animação de roda/bola e resolução probabilística.
- **Video Poker**: selecção de cartas para *hold*, *draw* e avaliação de mãos.

### 2.4 Iluminação e efeitos visuais
- Combinação de `AmbientLight`, `PointLight` e `SpotLight`.
- *Shadow mapping* com `PCFSoftShadowMap`.
- Nevoeiro exponencial (`FogExp2`) para profundidade atmosférica.
- Animações temporalmente consistentes com base em `delta time`.

---

## 3. Estrutura do projecto

```text
casino_royale/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── game.js
│   ├── games/
│   │   ├── blackjack.js
│   │   ├── roulette.js
│   │   └── poker.js
│   ├── scene/
│   │   ├── casino.js
│   │   ├── tables.js
│   │   ├── lights.js
│   │   └── textures.js
│   └── utils/
│       ├── cards.js
│       └── controls.js
└── README.md
```

**Princípio de organização:** separação entre construção de cena, lógica de jogos, utilitários e ciclo principal.


---

## 4. Utilização

### 4.1 Controlos

| Acção | Tecla |
|---|---|
| Avançar | `W` |
| Recuar | `S` |
| Deslocar à esquerda | `A` |
| Deslocar à direita | `D` |
| Olhar em redor | Rato (após clique para *pointer lock*) |
| Interagir com mesa próxima | `E` |
| Sair da mesa / regressar à exploração | `Esc` |

### 4.2 Fluxo de interacção

1. Entrar no casino pelo menu inicial.
2. Explorar o espaço em primeira pessoa.
3. Aproximar-se de uma mesa e premir `E`.
4. Executar acções do jogo no painel respectivo.
5. Sair com `Esc` e regressar ao modo de exploração.

---

## 5. Arquitectura de software

O sistema segue um estilo modular de responsabilidade única:

- `game.js`: estado global e ciclo principal de animação;
- `games/*.js`: regras de cada jogo;
- `scene/*.js`: construção geométrica, iluminação e texturas;
- `utils/*.js`: cartas, controlos e utilidades transversais.

### Máquina de estados (alto nível)

```text
MENU → EXPLORING → AT_TABLE
  ↑         ↓          ↑
  └─────────┴──────────┘
```

- `MENU`: interface inicial;
- `EXPLORING`: navegação livre;
- `AT_TABLE`: contexto de jogo activo.

---

## 6. Desempenho e depuração

### 6.1 Medidas já aplicadas
- Limitação de `pixelRatio` para evitar sobrecarga em ecrãs de alta densidade.
- Organização hierárquica da cena para actualizar apenas o necessário.
- Escolha equilibrada de resolução de sombras para qualidade/desempenho.

### 6.2 Procedimentos de depuração
- Inspecção de consola (`DevTools`) para estados de jogo e objectos da cena.
- Verificação de `dt` e estabilidade de animação.
- Testes de redimensionamento da janela e actualização da matriz de projecção.


