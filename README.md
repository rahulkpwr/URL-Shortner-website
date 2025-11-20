📌 URL Shortener Web Application (Node.js + Express)
A clean and simple URL Shortener Web Application similar to Bit.ly.

Users can create short links, view stats, track clicks, and manage all links from a dashboard.

Built using:
Node.js + Express (Backend)
Vanilla JS + HTML + CSS (Frontend)
JSON File Storage (Simple DB alternative)


🚀 Features
🔗 URL Shortening
Convert long URLs into short codes
Optional custom short codes (must be unique)
Validate URLs before saving
Short code rules: [A-Za-z0-9]{6,8}


🔁 Redirection
Visiting /:code performs an HTTP 302 redirect
Each redirect updates:
🗑 Link Management
Delete any link from dashboard or stats page
After deletion: /:code returns 404


📊 Dashboard
View full list of links
Columns include:
Short code
Target URL
Total clicks
Last clicked time


Features:
Search/filter
Sorting (Newest → Oldest, Most → Least clicked)
Copy short link
Open short link
Delete link


Inline statuses and loading states
📈 Stats Page
For each link: /code/:code
Shows:
Code
Target URL
Click count
Created time
Last clicked
Delete option included



❤️ Health Check
Endpoint: /healthz
Returns:
{
  "ok": true,
  "version": "1.0",
  "uptime_seconds": 123,
  "time": "2025-11-20T12:00:00Z"
}
| Component | Technology                    |
| --------- | ----------------------------- |
| Backend   | Node.js, Express              |
| Frontend  | HTML, Vanilla JS              |
| Styling   | Lightweight CSS               |
| Logging   | Morgan                        |
| Security  | Helmet                        |
| Storage   | JSON File (`data/links.json`) |

Total click count
Last clicked timestamp



url-shortener/
├── package.json
├── server.js
├── data/
│   └── links.json
└── public/
    ├── index.html
    ├── stats.html
    ├── styles.css
    └── app.js
🔧 Installation & Running the Project

1️⃣ Clone repository
git clone https://github.com/yourusername/url-shortener.git
cd url-shortener

2️⃣ Install dependencies
npm install

3️⃣ Start server
npm start

4️⃣ Open in browser
http://localhost:3000

📌 API Endpoints
POST /api/links
Create a new short link.
Body:
{
  "target": "https://example.com/long-url",
  "code": "custom123"   // optional
}
Responses:
201 Created
409 Code already exists

400 Invalid input
GET /api/links

List all links (supports search + sort)
Query params:
?q=keyword
&sort=created_desc | created_asc | clicks_desc | clicks_asc
GET /api/links/:code
Get stats of a specific link.\

DELETE /api/links/:code
Delete a link.

GET /:code
Redirect to original URL (or 404 if not exists)

GET /healthz
Health check.


🎨 UI & UX Details
Clean layout, spacing, readable typography
Dashboard table with ellipsis-truncated long URLs
Loading, empty, success, and error states
Disabled submit buttons during processing
Copy button for short links
Fully responsive


📝 Future Improvements (Optional)
Switch to SQLite or MongoDB
Add authentication (per-user links)
Track referrers, device info, geo analytics
Pagination for dashboard
Export stats

📄 License
This project is open-source and available under the MIT License.
