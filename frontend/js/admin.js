document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
    if (!user || user.role !== 'admin') {
        window.location.href = '/index.html';
        return;
    }
    
    document.getElementById('userName').textContent = user.name;
    loadUsers();

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
    
    if (role === 'student') {
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
    tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    
    try {
        const res = await fetch('/api/admin/users', {
            headers: getAuthHeaders()
        });
        const users = await res.json();
        
        tbody.innerHTML = '';
        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.name}</td>
                <td>${u.username}</td>
                <td>${u.email}</td>
                <td style="text-transform: capitalize;">${u.role}</td>
                <td><span class="badge" style="background:#475569">${u.hostel_type || ''} ${u.hostel_group || u.block || '-'}</span></td>
                <td>
                    ${u.id !== getUser().id ?  
                        `<button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="deleteUser(${u.id})">Delete</button>` 
                        : 'Current User'}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" style="color:var(--error-color)">Failed to load users</td></tr>';
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
