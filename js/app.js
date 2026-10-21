import { generateTOTP, secondsRemaining, parseOtpAuthUri } from "./totp.js";
import { addAccount, getAllAccounts, deleteAccount } from "./db.js";
import { startScan, stopScan } from "./qr.js";

const listEl = document.getElementById("account-list");
const emptyStateEl = document.getElementById("empty-state");
const btnAdd = document.getElementById("btn-add");
const scanDialog = document.getElementById("scan-dialog");
const scanVideo = document.getElementById("scan-video");
const scanCanvas = document.getElementById("scan-canvas");
const scanError = document.getElementById("scan-error");
const btnCancelScan = document.getElementById("btn-cancel-scan");
const confirmDialog = document.getElementById("confirm-dialog");
const confirmForm = document.getElementById("confirm-form");
const confirmIssuer = document.getElementById("confirm-issuer");
const confirmAccount = document.getElementById("confirm-account");
const btnCancelConfirm = document.getElementById("btn-cancel-confirm");
const statusLiveEl = document.getElementById("status-live");
const toastEl = document.getElementById("toast");

let accounts = [];
let pendingAccount = null;

async function loadAndRender() {
  accounts = await getAllAccounts();
  renderList();
}

function renderList() {
  emptyStateEl.hidden = accounts.length > 0;
  listEl.querySelectorAll(".account-card").forEach((el) => el.remove());

  for (const account of accounts) {
    const card = document.createElement("div");
    card.className = "account-card";
    card.dataset.id = account.id;
    card.innerHTML = `
      <div class="account-info">
        <div class="account-issuer">${escapeHtml(account.issuer || "Conta")}</div>
        <div class="account-name">${escapeHtml(account.account)}</div>
      </div>
      <div class="account-right">
        <div>
          <button type="button" class="account-code" aria-label="Copiar código">------</button>
          <span class="copy-hint" aria-hidden="true">tocar para copiar</span>
        </div>
        <svg class="account-timer" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="15" fill="none" stroke="#3a3f4a" stroke-width="3"></circle>
          <circle class="timer-progress" cx="18" cy="18" r="15" fill="none" stroke="#5b8cff" stroke-width="3"
            stroke-dasharray="94.2" stroke-dashoffset="0" transform="rotate(-90 18 18)"></circle>
        </svg>
        <button class="btn-delete" aria-label="Remover conta">🗑</button>
      </div>
    `;
    card.querySelector(".account-code").addEventListener("click", () => copyCode(card, account));
    card.querySelector(".btn-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      removeAccount(account.id);
    });
    listEl.appendChild(card);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

let toastTimer = null;

function showToast(message) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add("visible"));
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("visible");
    setTimeout(() => (toastEl.hidden = true), 150);
  }, 1500);
}

async function copyCode(card, account) {
  const codeEl = card.querySelector(".account-code");
  try {
    await navigator.clipboard.writeText(codeEl.textContent);
    const label = account.issuer || account.account || "conta";
    showToast(`Código de ${label} copiado`);
    statusLiveEl.textContent = `Código copiado para ${label}`;
  } catch {
    showToast("Não foi possível copiar o código");
  }
}

async function removeAccount(id) {
  await deleteAccount(id);
  await loadAndRender();
}

async function tick() {
  for (const account of accounts) {
    const card = listEl.querySelector(`.account-card[data-id="${account.id}"]`);
    if (!card) continue;
    const code = await generateTOTP(account.secret, {
      digits: account.digits,
      period: account.period,
      algorithm: account.algorithm,
    });
    const remaining = secondsRemaining(account.period);
    card.querySelector(".account-code").textContent = code;
    const circumference = 94.2;
    const offset = circumference * (1 - remaining / account.period);
    card.querySelector(".timer-progress").setAttribute("stroke-dashoffset", offset.toFixed(2));
  }
}

btnAdd.addEventListener("click", () => {
  scanError.hidden = true;
  scanDialog.showModal();
  startScan(scanVideo, scanCanvas, onScanResult, onScanError);
});

btnCancelScan.addEventListener("click", () => {
  stopScan();
  scanDialog.close();
});

function onScanResult(data) {
  stopScan();
  try {
    pendingAccount = parseOtpAuthUri(data);
  } catch (err) {
    scanError.textContent = "QR code inválido: " + err.message;
    scanError.hidden = false;
    startScan(scanVideo, scanCanvas, onScanResult, onScanError);
    return;
  }
  scanDialog.close();
  confirmIssuer.textContent = pendingAccount.issuer || "Conta sem nome";
  confirmAccount.textContent = pendingAccount.account;
  confirmDialog.showModal();
}

function onScanError(err) {
  scanError.textContent = "Não foi possível acessar a câmera: " + err.message;
  scanError.hidden = false;
}

btnCancelConfirm.addEventListener("click", () => {
  pendingAccount = null;
  confirmDialog.close();
});

confirmForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (pendingAccount) {
    await addAccount(pendingAccount);
    pendingAccount = null;
    await loadAndRender();
  }
  confirmDialog.close();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

loadAndRender();
setInterval(tick, 1000);
