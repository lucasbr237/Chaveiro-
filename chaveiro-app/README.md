# Chaveiro Rápido — Capacitor / Android

Este pacote já está pronto pra funcionar **100% offline** (sem CDN do Tailwind,
sem Google Fonts remoto, sem depender da BrasilAPI pra abrir) e com
**biometria nativa real** (digital / Face ID) via `capacitor-native-biometric`.

Eu não consigo rodar `npm install`, baixar fontes ou compilar o `.apk` aqui
(este ambiente não tem acesso à internet nem Android SDK/gradle instalados).
Os passos abaixo rodam na sua máquina — precisa de: **Node.js 18+**,
**Android Studio** (com SDK + um dispositivo/emulador) e internet só nesta
etapa de setup.

## O que já foi feito neste pacote
- `www/index.html` — sem tags de CDN, referenciando CSS e JS locais.
- `www/js/app.js` — lógica original, com duas trocas:
  - **Bancos**: carrega `www/data/banks.json` (empacotado, ~60 bancos/PSPs
    de Pix mais usados) instantaneamente; se detectar internet, atualiza a
    lista em segundo plano via BrasilAPI sem bloquear a tela.
  - **Biometria**: botão de digital chama `@capgo/capacitor-native-biometric`
    de verdade (fingerprint/Face). Se o dispositivo não tiver sensor ou o app
    estiver rodando fora do Capacitor (ex.: preview no navegador), o botão
    some e cai automaticamente pro fluxo de PIN.

  > ⚠️ **Sobre a versão do plugin de biometria**: usei `@capgo/capacitor-native-biometric`
  > (fork mantido do antigo `capacitor-native-biometric`, que está abandonado
  > há anos e não roda no Capacitor 8). Esse fork teve uma vulnerabilidade real
  > divulgada em fevereiro/2026 — [GHSA-vx5f-vmr6-32wf](https://github.com/advisories/GHSA-vx5f-vmr6-32wf):
  > em aparelhos com root/jailbreak, era possível usar Frida para forçar a
  > biometria a "passar" sem checar digital de verdade. Foi corrigida na
  > versão **8.3.6**. O `package.json` já está fixado em `^8.4.2`
  > (versão corrigida) — **não** faça downgrade desse pacote.

- **Assinatura (paywall)**: o botão "Assinar por R$ 7,90/mês" agora chama o
  **Google Play Billing** de verdade via `@capawesome-team/capacitor-purchases`
  (cobrança no cartão do usuário, o Google fica com a fatia — 15% a 30%
  dependendo do seu volume/programa). Fora do Capacitor nativo (preview web),
  o fluxo simula a liberação só pra você testar a tela sem comprar de fato.

## Configurar a assinatura no Play Console (antes de testar de verdade)

1. No Play Console, vá em **Monetizar → Produtos → Assinaturas** e crie um
   produto com o ID `chaveiro_premium_mensal` (é esse ID que está fixado em
   `www/js/app.js`, na constante `SUBSCRIPTION_PRODUCT_ID` — pode trocar o
   nome, mas tem que bater dos dois lados).
2. Configure o **plano base mensal** com o preço (ex.: R$ 7,90). Se quiser
   também o anual, crie um segundo plano base no mesmo produto e ajuste o
   app pra deixar o usuário escolher (hoje o botão único compra sempre o
   plano fixado na constante).
3. Pra testar sem cobrar de verdade: em **Configurações → Testes de licença**,
   adicione seu e-mail da Play Store como testador. Contas de teste veem o
   fluxo de compra real da Play Store, mas sem cobrança.
4. **Importante**: assinaturas só ficam disponíveis pra compra depois que o
   app tiver pelo menos uma versão enviada a uma trilha de teste (fechado,
   aberto ou interno) no Play Console — não funciona só com `./gradlew
   assembleDebug` local sem nunca ter subido nada pra loja.

> ⚠️ **Sobre validação server-side**: o app hoje não tem backend, então a
> checagem de "está assinado?" é feita só no cliente, consultando o Google
> Play Billing local (`Purchases.getCurrentTransactions()`). Isso já cobre a
> maioria dos casos de uso normais, mas não impede 100% fraude via app
> modificado/engenharia reversa. Pra um app cobrando de verdade em produção,
> o recomendado é validar o `purchaseToken` num servidor seu usando a
> [Google Play Developer API](https://developers.google.com/android-publisher) —
> isso fica fora do escopo deste pacote, que é intencionalmente sem backend.
- `tailwind.config.js` — tema (cores, spacing, tipografia) extraído do config
  inline original, agora compilável localmente.
- `capacitor.config.ts` — `webDir: www`, plugin de biometria já habilitado.

## Passo 1 — instalar dependências
```bash
npm install
```

## Passo 2 — gerar o CSS e (opcional) atualizar a lista de bancos
```bash
npm run build:css
```
Isso lê `src/input.css` + `tailwind.config.js` e gera `www/css/styles.css`
com só as classes usadas — nada de rede em runtime.

**Lista de bancos completa (opcional):** `www/data/banks.json` já tem os
bancos/PSPs de Pix mais usados no dia a dia de um chaveiro. Se quiser a lista
oficial completa do Banco Central (~300 instituições), rode uma vez com
internet:
```bash
curl -s https://brasilapi.com.br/api/banks/v1 -o www/data/banks.json
```

**Fontes (opcional):** para ficar pixel-perfect com Inter + Material Symbols,
baixe os `.woff2` uma vez (ex. via https://gwfh.mranftl.com/fonts, buscando
"Inter" e "Material Symbols Outlined", pesos 400/500/600/700) e salve em
`www/assets/fonts/` com os nomes listados em `www/assets/fonts/README.txt`.
Sem isso o app abre normalmente com fonte de sistema como fallback.

## Passo 3 — criar o projeto Android e sincronizar
```bash
npx cap add android
npx cap sync android
```

### Habilitar biometria no Android
O plugin já cuida do essencial, mas confirme em
`android/app/src/main/AndroidManifest.xml` se a permissão está presente
(o próprio `cap sync` normalmente já injeta isso do plugin):
```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
```
E que o `minSdkVersion` no `android/variables.gradle` seja **23 ou maior**
(exigência do BiometricPrompt do Android).

## Passo 4 — abrir no Android Studio e gerar o APK
```bash
npx cap open android
```
No Android Studio: **Build → Generate Signed Bundle / APK** → escolha APK →
crie ou selecione seu keystore → `release`. Isso gera o `.apk` assinado,
pronto para instalar ou publicar.

Pra testar rápido num emulador/aparelho conectado sem gerar APK assinado
ainda, dá pra rodar direto: **Run ▶** no Android Studio.

## Resumo do que fica local no APK
| Antes (CDN)                          | Agora (empacotado)                     |
|---------------------------------------|-----------------------------------------|
| `cdn.tailwindcss.com`                 | `www/css/styles.css` (gerado no build) |
| `fonts.googleapis.com` / `gstatic`    | `www/css/fonts.css` + `assets/fonts/`  |
| `fetch(brasilapi.com.br/.../banks)`   | `www/data/banks.json` (+ refresh best-effort em BG) |
| Biometria "fake" (só troca de tela)   | `@capgo/capacitor-native-biometric` (≥8.3.6, sem o bypass do CVE) |
| Assinatura "fake" (só liga isPremium)  | `@capawesome-team/capacitor-purchases` (Google Play Billing real) |

Zero chamada de rede é obrigatória pra abrir e usar o app.
