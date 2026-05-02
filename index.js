const express = require('express');

// Server 2 on port 8081
const app2 = express();
app2.get('/', (req, res) => res.send('Hello from port 8081'));
app2.listen(8081, () => console.log('Server running on port 8081'));

// Server 3 on port 8082
const app3 = express();
app3.get('/', (req, res) => res.send('Hello from port 8082'));
app3.listen(8082, () => console.log('Server running on port 8082'));

// Server 4 on port 18756
const app4 = express();
app4.get('/', (req, res) => res.send('Hello from port 18756'));
app4.listen(18756, () => console.log('Server running on port 18756'));

// Server 5 on port 18757
const app5 = express();
app5.get('/', (req, res) => res.send('Hello from port 18757'));
app5.listen(18757, () => console.log('Server running on port 18757'));

// Server 6 on port 20389
const app6 = express();
app6.get('/', (req, res) => res.send('Hello from port 20389'));
app6.listen(20389, () => console.log('Server running on port 20389'));