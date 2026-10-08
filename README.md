# Autenticador 2FA

PWA para gerar códigos TOTP (padrão usado pelo Google Authenticator, Authy, etc.), compatível com qualquer site que ofereça 2FA via QR code.

Os segredos ficam apenas no navegador (IndexedDB local) — nada é enviado para nenhum servidor.

## Rodando localmente

```bash
python3 -m http.server 8787
```

Abra `http://localhost:8787` no navegador. Para escanear QR codes é preciso acesso à câmera, então use `https://` ou `localhost` (ambos contam como contexto seguro).

## Instalar como app

No Chrome/Edge, abra o site e use "Instalar app" (ícone na barra de endereço) para instalá-lo como PWA, com ícone próprio e funcionamento offline.

## Estrutura

- `js/totp.js` — geração de códigos TOTP (RFC 6238) e parsing de URIs `otpauth://`
- `js/qr.js` — leitura de QR code via câmera (usa a lib `jsQR`)
- `js/db.js` — persistência local das contas no IndexedDB
- `js/app.js` — interface e orquestração
- `sw.js` — service worker para funcionamento offline
