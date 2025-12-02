const { HttpsProxyAgent } = require("https-proxy-agent");

const url =
  "https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&country=vn,sg&proxy_format=protocolipport&format=json&timeout=20000";

const ipProxyUrl = "https://api.ipify.org/?format=json";

// Dynamic import for node-fetch v3 (ESM-only)
let fetch;

const proxyCheck = async (proxy, fetchFn) => {
  try {
    // console.log('Checking proxy:', proxy);
    const agent = new HttpsProxyAgent(proxy);
    const response = await fetchFn(ipProxyUrl, {
      agent: agent,
    });

    const rs = await response.json();
    return rs.ip;
  } catch (e) {
    // console.log("Error:", e);
    return null;
  }
};

const proxyMap = new Map();

const fetchProxies = async () => {
  // Import node-fetch dynamically
  if (!fetch) {
    const fetchModule = await import("node-fetch");
    fetch = fetchModule.default;
  }

  const response = await fetch(url);
  const data = await response.json();

  for (const item of data?.proxies) {
    proxyCheck(item.proxy, fetch).then((ip) => {
      if (ip) {
        proxyMap.set(item.proxy, {
          ip: ip,
          lastChecked: Date.now(),
          country: item.ip_data.country,
        });
        console.log(item.proxy, item.ip, ip);
      } else {
        proxyMap.delete(item.proxy);
      }
    });
  }
};

fetchProxies();


setInterval(() => {
  console.log('Checking proxy map:', proxyMap.size);
  for (const [proxy, data] of proxyMap.entries()) {
    console.log(data.country, ':', data.ip);
  }
}, 10000);


setInterval(() => {
  fetchProxies();
}, 60000);
