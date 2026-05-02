import './style.css'

async function fetchFromPort(port) {
  try {
    const response = await fetch(`http://localhost:${port}`);
    const text = await response.text();
    return text;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

async function loadServices() {
  const ports = [8081, 8082, 18756, 18757, 20389];
  const results = await Promise.all(ports.map(port => fetchFromPort(port)));
  const app = document.querySelector('#app');
  app.innerHTML = `
    <div>
      <h1>Attached Assets - Sentinel App</h1>
      <p>Welcome to the Sentinel monitoring application.</p>
      <h2>Service Status</h2>
      <ul>
        ${ports.map((port, i) => `<li>Port ${port}: ${results[i]}</li>`).join('')}
      </ul>
    </div>
  `;
}

loadServices();