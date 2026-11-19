/**
 * Made-up data for the playground's Dashboard and Laporan. It is deterministic (the same day always gives the same
 * numbers), so the pages look the same on every visit and the date range changes what is shown.
 */

export const isoDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const rangeEndingToday = (days: number) => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1));

    return { from: isoDate(start), to: isoDate(end) };
};

/** A small seeded random generator (mulberry32). */
function random(seed: number) {
    let a = seed >>> 0;

    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const seedOf = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export const daysBetween = (from: string, to: string) => {
    const out: string[] = [];

    for (let d = new Date(`${from}T00:00:00`); isoDate(d) <= to && out.length < 400; d.setDate(d.getDate() + 1)) {
        out.push(isoDate(d));
    }

    return out;
};

export const rupiah = (n: number) =>
    n >= 1_000_000_000
        ? `Rp ${(n / 1_000_000_000).toFixed(1)} M`
        : n >= 1_000_000
          ? `Rp ${(n / 1_000_000).toFixed(1)} jt`
          : `Rp ${new Intl.NumberFormat('id-ID').format(n)}`;

export const rupiahFull = (n: number) => `Rp ${new Intl.NumberFormat('id-ID').format(n)}`;

export const CATEGORIES = ['Elektronik', 'Perabot', 'Pakaian', 'Makanan', 'Olahraga', 'Buku'] as const;
export const STATUSES = ['Selesai', 'Diproses', 'Dikirim', 'Dibatalkan'] as const;
export type Status = (typeof STATUSES)[number];

const CUSTOMERS = [
    'PT Maju Bersama', 'CV Sinar Jaya', 'Toko Berkah', 'PT Nusantara Abadi', 'UD Makmur', 'Budi Santoso', 'Citra Dewi',
    'PT Karya Mandiri', 'CV Cahaya Baru', 'Ani Wijaya', 'Dian Pratama', 'PT Sumber Rejeki', 'Toko Sejahtera', 'Rudi Hartono',
];

export type Sale = {
    id: string;
    date: string;
    customer: string;
    category: (typeof CATEGORIES)[number];
    status: Status;
    qty: number;
    amount: number;
};

/** Orders for every day of the range: a few per day, more on weekdays. */
export function salesBetween(from: string, to: string): Sale[] {
    const rows: Sale[] = [];

    for (const date of daysBetween(from, to)) {
        const rand = random(seedOf(date));
        const weekday = new Date(`${date}T00:00:00`).getDay();
        const count = Math.round((weekday === 0 || weekday === 6 ? 1 : 3) + rand() * 3);

        for (let i = 0; i < count; i++) {
            const category = CATEGORIES[Math.floor(rand() * CATEGORIES.length)];
            const roll = rand();
            const qty = 1 + Math.floor(rand() * 9);
            const unit = [2_400_000, 850_000, 240_000, 65_000, 420_000, 95_000][CATEGORIES.indexOf(category)];

            rows.push({
                id: `INV-${date.replaceAll('-', '').slice(2)}-${String(i + 1).padStart(2, '0')}`,
                date,
                customer: CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)],
                category,
                status: roll < 0.62 ? 'Selesai' : roll < 0.8 ? 'Diproses' : roll < 0.94 ? 'Dikirim' : 'Dibatalkan',
                qty,
                amount: Math.round((qty * unit * (0.9 + rand() * 0.25)) / 1000) * 1000,
            });
        }
    }

    return rows.reverse();
}

export const ACTIVITIES = [
    { action: 'tambah_pelanggan', text: 'Menambah pelanggan PT Karya Mandiri', who: 'Ani Admin', ago: '5 menit lalu' },
    { action: 'setujui_pesanan', text: 'Menyetujui pesanan INV-261118-03', who: 'Budi Santoso', ago: '22 menit lalu' },
    { action: 'ubah_harga', text: 'Mengubah harga kategori Elektronik', who: 'Citra Dewi', ago: '1 jam lalu' },
    { action: 'ekspor_laporan', text: 'Mengekspor laporan penjualan Oktober', who: 'Demo', ago: '2 jam lalu' },
    { action: 'hapus_produk', text: 'Menghapus produk "Kaos lama"', who: 'Ani Admin', ago: '3 jam lalu' },
    { action: 'masuk', text: 'Masuk dengan kode email', who: 'Dian Pratama', ago: '5 jam lalu' },
    { action: 'tambah_pesanan', text: 'Membuat pesanan INV-261118-01', who: 'Budi Santoso', ago: 'kemarin' },
];
