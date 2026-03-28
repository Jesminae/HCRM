document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
    if (!user || user.role !== 'admin') {
        window.location.href = '/index.html';
        return;
    }
    
    document.getElementById('userName').textContent = user.name;
    loadUsers();

    const today = new Date();
    document.getElementById('statsMonth').value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    loadStats();

    document.getElementById('addUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('addMsg');
        msg.textContent = '';
        msg.style.color = 'var(--error-color)';

        const payload = {
            name: document.getElementById('name').value,
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            role: document.getElementById('role').value,
            room_no: document.getElementById('room_no').value,
            block: document.getElementById('block').value,
            hostel_group: document.getElementById('hostel_group').value,
            hostel_type: document.getElementById('hostel_type').value
        };

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (res.ok) {
                msg.style.color = 'var(--success-color)';
                msg.textContent = 'User added successfully';
                document.getElementById('addUserForm').reset();
                toggleRoleFields();
                loadUsers();
            } else {
                msg.textContent = data.error || 'Failed to add user';
            }
        } catch (err) {
            msg.textContent = 'Network error';
        }
    });
});

function toggleRoleFields() {
    const role = document.getElementById('role').value;
    const sf = document.getElementById('studentFields');
    const gf = document.getElementById('groupField');
    const tf = document.getElementById('typeField');
    
    if (role === 'student' || role === 'temporary') {
        sf.classList.remove('hidden');
        gf.classList.add('hidden');
        tf.classList.remove('hidden');
    } else if (role === 'committee') {
        sf.classList.add('hidden');
        gf.classList.remove('hidden');
        tf.classList.remove('hidden');
    } else {
        sf.classList.add('hidden');
        gf.classList.add('hidden');
        tf.classList.add('hidden');
    }
}

async function loadUsers() {
    const tbody = document.querySelector('#usersTable tbody');
    const tempTbody = document.querySelector('#tempUsersTable tbody');
    tbody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';
    tempTbody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';
    
    try {
        const res = await fetch('/api/admin/users', {
            headers: getAuthHeaders()
        });
        const users = await res.json();
        
        tbody.innerHTML = '';
        tempTbody.innerHTML = '';
        users.forEach(u => {
            const tr = document.createElement('tr');
            if (u.role === 'temporary') {
                tr.innerHTML = `
                    <td>${u.name}</td>
                    <td>${u.username}</td>
                    <td>${u.email}</td>
                    <td>${u.hostel_type || ''}</td>
                    <td>${u.block || '-'}</td>
                    <td>${u.room_no || '-'}</td>
                    <td>
                        ${u.id !== getUser().id ?  
                            `<button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="deleteUser(${u.id})">Delete</button>` 
                            : 'Current User'}
                    </td>
                `;
                tempTbody.appendChild(tr);
            } else {
                tr.innerHTML = `
                    <td>${u.name}</td>
                    <td>${u.username}</td>
                    <td>${u.email}</td>
                    <td style="text-transform: capitalize;">${u.role}</td>
                    <td><span class="badge" style="background:#475569">${u.hostel_type || ''} ${u.hostel_group || u.block || '-'}</span></td>
                    <td>${u.room_no || '-'}</td>
                    <td>
                        ${u.id !== getUser().id ?  
                            `<button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="deleteUser(${u.id})">Delete</button>` 
                            : 'Current User'}
                    </td>
                `;
                tbody.appendChild(tr);
            }
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" style="color:var(--error-color)">Failed to load users</td></tr>';
        tempTbody.innerHTML = '<tr><td colspan="7" style="color:var(--error-color)">Failed to load users</td></tr>';
    }
}

async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        const res = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            loadUsers();
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to delete');
        }
    } catch (err) {
        alert('Network error');
    }
}

async function loadStats() {
    const month = document.getElementById('statsMonth').value;
    const totalRegularTbody = document.querySelector('#totalBlockTable tbody');
    const totalTempTbody = document.querySelector('#totalTempTable tbody');
    const activeTbody = document.querySelector('#activeMonthTable tbody');
    
    totalRegularTbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
    totalTempTbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
    activeTbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
    
    try {
        const res = await fetch(`/api/admin/dashboard-stats?month=${month}`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();
        
        totalRegularTbody.innerHTML = '';
        if (data.totalRegularStudents && data.totalRegularStudents.length > 0) {
            data.totalRegularStudents.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${row.hostel_type || '-'}</td><td>${row.block || '-'}</td><td><span class="badge" style="background:var(--primary-color)">${row.count}</span></td>`;
                totalRegularTbody.appendChild(tr);
            });
        } else {
            totalRegularTbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No data found</td></tr>';
        }

        totalTempTbody.innerHTML = '';
        if (data.totalTemporaryStudents && data.totalTemporaryStudents.length > 0) {
            data.totalTemporaryStudents.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${row.hostel_type || '-'}</td><td>${row.block || '-'}</td><td><span class="badge" style="background:var(--primary-color)">${row.count}</span></td>`;
                totalTempTbody.appendChild(tr);
            });
        } else {
            totalTempTbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No data found</td></tr>';
        }
        
        activeTbody.innerHTML = '';
        if (data.activeThisMonth && data.activeThisMonth.length > 0) {
            data.activeThisMonth.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${row.hostel_type || '-'}</td><td>${row.block || '-'}</td><td><span class="badge" style="background:var(--secondary-color)">${row.count}</span></td>`;
                activeTbody.appendChild(tr);
            });
        } else {
            activeTbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No data found</td></tr>';
        }
    } catch (err) {
        totalRegularTbody.innerHTML = '<tr><td colspan="3" style="color:var(--error-color)">Failed to load data</td></tr>';
        totalTempTbody.innerHTML = '<tr><td colspan="3" style="color:var(--error-color)">Failed to load data</td></tr>';
        activeTbody.innerHTML = '<tr><td colspan="3" style="color:var(--error-color)">Failed to load data</td></tr>';
    }
}
