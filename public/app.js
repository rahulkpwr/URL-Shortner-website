// Basic client code for dashboard and stats page
const api = {
  create: (data) => fetch('/api/links', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(data)}).then(r => r.json().then(j=>({status:r.status, body:j}))),
  list: (q, sort) => fetch('/api/links?q=' + encodeURIComponent(q||'') + '&sort=' + encodeURIComponent(sort||'created_desc')).then(r=>r.json()),
  get: (code) => fetch('/api/links/' + encodeURIComponent(code)).then(r=>r.json().then(j => ({status:r.status, body:j}))),
  del: (code) => fetch('/api/links/' + encodeURIComponent(code), {method:'DELETE'}).then(r=>r.json())
};

function $(s){return document.querySelector(s)}
function $all(s){return document.querySelectorAll(s)}

// --- Dashboard logic ---
if (document.getElementById('createForm')) {
  const createForm = $('#createForm');
  const targetInput = $('#target');
  const codeInput = $('#code');
  const createBtn = $('#createBtn');
  const createMsg = $('#createMsg');
  const targetHint = $('#targetHint');
  const codeHint = $('#codeHint');

  const linksTable = $('#linksTable');
  const linksBody = $('#linksBody');
  const emptyState = $('#emptyState');
  const loading = $('#loading');
  const search = $('#search');
  const sortSel = $('#sort');
  const refresh = $('#refresh');

  function showLoading(on) {
    loading.classList.toggle('hidden', !on);
    linksTable.classList.toggle('hidden', on);
    emptyState.classList.add('hidden');
  }

  async function fetchAndRender() {
    showLoading(true);
    try {
      const q = search.value.trim();
      const sort = sortSel.value;
      const res = await api.list(q, sort);
      const links = res.links || [];
      showLoading(false);
      if (!links.length) {
        emptyState.classList.remove('hidden');
        linksTable.classList.add('hidden');
        return;
      }
      linksTable.classList.remove('hidden');
      emptyState.classList.add('hidden');
      linksBody.innerHTML = '';
      links.forEach(l=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><a href="/code/${encodeURIComponent(l.code)}" title="Stats">${l.code}</a></td>
          <td class="target"><a href="${l.target}" target="_blank" title="${l.target}">${l.target}</a></td>
          <td>${l.clicks || 0}</td>
          <td>${l.last_clicked ? new Date(l.last_clicked).toLocaleString() : '-'}</td>
          <td class="actions">
            <button data-copy="${l.code}">Copy</button>
            <a href="/${encodeURIComponent(l.code)}" target="_blank"><button>Open</button></a>
            <button data-delete="${l.code}" class="danger">Delete</button>
          </td>
        `;
        linksBody.appendChild(tr);
      });
    } catch (e) {
      console.error(e);
      loading.textContent = 'Failed to load';
    }
  }

  // initial load
  fetchAndRender();

  // events
  refresh.addEventListener('click', fetchAndRender);
  search.addEventListener('input', () => { debounce(fetchAndRender, 400)();});
  sortSel.addEventListener('change', fetchAndRender);

  // form submit
  createForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    createMsg.textContent = ''; targetHint.textContent=''; codeHint.textContent='';
    const target = targetInput.value.trim();
    const code = codeInput.value.trim();

    if (!target) { targetHint.textContent = 'Please provide a URL.'; return; }
    // basic client-side validation
    if (code && !/^[A-Za-z0-9]{6,8}$/.test(code)) {
      codeHint.textContent = 'Custom code must be 6-8 alphanumeric characters.';
      return;
    }
    createBtn.disabled = true;
    createBtn.textContent = 'Creating...';

    const resp = await api.create({ target, code: code || undefined });
    createBtn.disabled = false;
    createBtn.textContent = 'Create';
    if (resp.status >= 400) {
      createMsg.textContent = resp.body && resp.body.error ? resp.body.error : 'Failed';
      createMsg.style.color = 'var(--danger)';
    } else {
      createMsg.textContent = 'Created: ' + resp.body.link.code;
      createMsg.style.color = 'green';
      targetInput.value = '';
      codeInput.value = '';
      fetchAndRender();
    }
  });

  // delegate actions (copy/delete)
  linksBody.addEventListener('click', async (ev) => {
    const copy = ev.target.getAttribute('data-copy');
    const del = ev.target.getAttribute('data-delete');
    if (copy) {
      const url = location.origin + '/' + copy;
      try {
        await navigator.clipboard.writeText(url);
        ev.target.textContent = 'Copied';
        setTimeout(()=>ev.target.textContent = 'Copy', 1500);
      } catch (e) {
        alert('Copy failed, URL: ' + url);
      }
    } else if (del) {
      if (!confirm('Delete link ' + del + ' ?')) return;
      ev.target.disabled = true;
      const resp = await api.del(del);
      if (resp.ok) {
        fetchAndRender();
      } else {
        alert('Delete failed');
        ev.target.disabled = false;
      }
    }
  });

  // debounce helper
  function debounce(fn, wait) {
    let t;
    return () => { clearTimeout(t); t = setTimeout(()=>fn(), wait); };
  }
}

// --- Stats page logic ---
if (document.getElementById('statsCard')) {
  const codeFromPath = window.location.pathname.split('/').pop();
  const statsLoading = $('#statsLoading');
  const statsError = $('#statsError');
  const statsContent = $('#statsContent');
  const statsCode = $('#statsCode');
  const statsTarget = $('#statsTarget');
  const statsClicks = $('#statsClicks');
  const statsCreated = $('#statsCreated');
  const statsLast = $('#statsLast');
  const openRedirect = $('#openRedirect');
  const deleteBtn = $('#deleteBtn');
  const deleteMsg = $('#deleteMsg');

  async function load() {
    statsLoading.classList.remove('hidden'); statsError.classList.add('hidden'); statsContent.classList.add('hidden');
    try {
      const fetchResp = await fetch('/api/links/' + encodeURIComponent(codeFromPath));
      const data = await fetchResp.json();
      if (fetchResp.status === 404) {
        statsError.textContent = 'Link not found'; statsError.classList.remove('hidden'); return;
      }
      const link = data.link;
      statsCode.textContent = '/' + link.code;
      statsTarget.textContent = link.target;
      statsTarget.href = link.target;
      statsClicks.textContent = link.clicks || 0;
      statsCreated.textContent = new Date(link.created_at).toLocaleString();
      statsLast.textContent = link.last_clicked ? new Date(link.last_clicked).toLocaleString() : '-';
      openRedirect.href = '/' + link.code;
      statsLoading.classList.add('hidden');
      statsContent.classList.remove('hidden');
    } catch (e) {
      statsError.textContent = 'Failed to load'; statsError.classList.remove('hidden');
    }
  }
  load();

  deleteBtn.addEventListener('click', async () => {
    if (!confirm('Delete this link?')) return;
    deleteBtn.disabled = true;
    deleteMsg.textContent = 'Deleting...';
    try {
      const resp = await fetch('/api/links/' + encodeURIComponent(codeFromPath), {method:'DELETE'});
      const j = await resp.json();
      if (j.ok) {
        deleteMsg.textContent = 'Deleted. Redirecting to dashboard...';
        setTimeout(()=>location.href='/', 900);
      } else {
        deleteMsg.textContent = 'Delete failed';
      }
    } catch (e) {
      deleteMsg.textContent = 'Delete failed';
    } finally {
      deleteBtn.disabled = false;
    }
  });
}
