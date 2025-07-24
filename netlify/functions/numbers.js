const fetch = require('node-fetch');

// --- Informasi Gist ---
const GIST_ID = '3c27f74a3fcf5b6c1db2a8b9fa33dc47';
const GIST_FILENAME = 'users.json';
const GIST_URL = `https://api.github.com/gists/${GIST_ID}`;

// --- Password ---
const OWNER_PASS = 'KannaKamuiNovita';
const RESELLER_PASS = 'KannaKamuiBot';


// --- Fungsi Pembantu untuk Gist (Sudah Dimodifikasi) ---
async function getGistData(token) {
    const response = await fetch(GIST_URL, {
        headers: { 'Authorization': `token ${token}` }
    });
    if (!response.ok) throw new Error('Gagal mengambil data dari Gist.');
    const gist = await response.json();
    const content = gist.files[GIST_FILENAME]?.content;
    // Jika Gist kosong, kembalikan array kosong. Jika tidak, parse sebagai array.
    return content ? JSON.parse(content) : [];
}

async function updateGistData(token, data) {
    await fetch(GIST_URL, {
        method: 'PATCH',
        headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            files: { [GIST_FILENAME]: { content: JSON.stringify(data, null, 2) } }
        })
    });
}


// --- Handler Utama (Sudah Dimodifikasi) ---
exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    const { action, ...payload } = JSON.parse(event.body);
    const GITHUB_TOKEN = process.env.GIST_TOKEN;

    if (!GITHUB_TOKEN && action !== 'login') {
        return { statusCode: 500, body: JSON.stringify({ message: 'GIST_TOKEN tidak di-set di server!' }) };
    }

    try {
        switch (action) {
            case 'login': {
                const { password } = payload;
                if (password === OWNER_PASS) return { statusCode: 200, body: JSON.stringify({ role: 'Owner' }) };
                if (password === RESELLER_PASS) return { statusCode: 200, body: JSON.stringify({ role: 'Reseller' }) };
                throw new Error('Password salah!');
            }
            case 'getNumbers': {
                // Sekarang mengirim data dalam format {"numbers": [...]} agar frontend tidak perlu diubah
                const numbers = await getGistData(GITHUB_TOKEN);
                return { statusCode: 200, body: JSON.stringify({ numbers: numbers }) };
            }
            case 'addNumber': {
                const { number } = payload;
                if (!number) throw new Error('Nomor tidak boleh kosong.');
                let numbers = await getGistData(GITHUB_TOKEN); // 'data' sekarang adalah array
                if (!numbers.includes(number)) {
                    numbers.push(number);
                    numbers.sort();
                    await updateGistData(GITHUB_TOKEN, numbers); // Simpan array langsung
                }
                return { statusCode: 200, body: JSON.stringify({ message: 'Berhasil ditambah' }) };
            }
            case 'deleteNumber': {
                const { number } = payload;
                let numbers = await getGistData(GITHUB_TOKEN); // 'data' sekarang adalah array
                numbers = numbers.filter(n => n !== number); // Filter array langsung
                await updateGistData(GITHUB_TOKEN, numbers); // Simpan array langsung
                return { statusCode: 200, body: JSON.stringify({ message: 'Berhasil dihapus' }) };
            }
            default:
                throw new Error('Aksi tidak valid.');
        }
    } catch (error) {
        return { statusCode: 400, body: JSON.stringify({ message: error.message }) };
    }
};
