let vault = null;
let masterKey = null;
let lockTimer = null;

async function saveVault() {
  const encrypted = await encryptVault(masterKey, vault);
  localStorage.setItem("vault", JSON.stringify(encrypted));
}

async function loadVault(password) {
  const encVault = localStorage.getItem("vault");
  if (!encVault) return false;
  try {
    vault = await decryptVault(password, JSON.parse(encVault));
    masterKey = password;
    return true;
  } catch (e) {
    console.error("Unlock failed", e);
    return false;
  }
}

function renderEntries() {
  const container = document.getElementById("entries");
  container.innerHTML = "";
  vault.forEach((entry, idx) => {
    const div = document.createElement("div");
    div.className = "entry";
    div.innerHTML = `<b>${entry.name}</b><br>${entry.username}<br>
      <button data-idx="${idx}" class="copyBtn">Copy</button>
      <button data-idx="${idx}" class="fillBtn">Fill</button>`;
    container.appendChild(div);
  });
  document.querySelectorAll(".copyBtn").forEach(b => b.onclick = copyEntry);
  document.querySelectorAll(".fillBtn").forEach(b => b.onclick = fillEntry);
}

function copyEntry(e) {
  const idx = e.target.dataset.idx;
  navigator.clipboard.writeText(vault[idx].password);
  setTimeout(() => {
    navigator.clipboard.writeText("");
  }, 20000);
}

function fillEntry(e) {
  const idx = e.target.dataset.idx;
  chrome.scripting.executeScript({
    target: { tabId: chrome.devtools.inspectedWindow?.tabId || chrome.tabs.TAB_ID_CURRENT },
    func: (entry) => {
      const passField = document.querySelector('input[type=password]');
      if (passField) passField.value = entry.password;
      const userField = document.querySelector('input[type=email], input[type=text]');
      if (userField) userField.value = entry.username;
    },
    args: [vault[idx]]
  });
}

function resetLockTimer() {
  if (lockTimer) clearTimeout(lockTimer);
  lockTimer = setTimeout(() => {
    document.getElementById("locked").style.display = "block";
    document.getElementById("unlocked").style.display = "none";
    vault = null;
    masterKey = null;
  }, 120000);
}

document.getElementById("unlockBtn").onclick = async () => {
  const pw = document.getElementById("masterPassword").value;
  const ok = await loadVault(pw);
  if (ok) {
    document.getElementById("locked").style.display = "none";
    document.getElementById("unlocked").style.display = "block";
    renderEntries();
    resetLockTimer();
  } else alert("Unlock failed");
};

document.getElementById("createVaultBtn").onclick = async () => {
  const pw = document.getElementById("masterPassword").value;
  masterKey = pw;
  vault = [];
  await saveVault();
  alert("Vault created");
};

document.getElementById("lockBtn").onclick = () => {
  vault = null;
  masterKey = null;
  document.getElementById("locked").style.display = "block";
  document.getElementById("unlocked").style.display = "none";
};

document.getElementById("saveBtn").onclick = async () => {
  vault.push({
    name: document.getElementById("entryName").value,
    username: document.getElementById("entryUser").value,
    url: document.getElementById("entryUrl").value,
    password: document.getElementById("entryPass").value
  });
  await saveVault();
  renderEntries();
};

document.getElementById("genBtn").onclick = () => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  let pass = "";
  for (let i = 0; i < 16; i++) pass += charset[Math.floor(Math.random() * charset.length)];
  document.getElementById("entryPass").value = pass;
};

document.getElementById("exportBtn").onclick = () => {
  const encVault = localStorage.getItem("vault");
  if (!encVault) { alert("No vault"); return; }
  const blob = new Blob([encVault], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "vault-" + new Date().toISOString().split("T")[0] + ".json";
  a.click();
};