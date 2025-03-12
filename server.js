
const express = require('express');
const app = express();
const PORT = 8000;

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.use((err, req, res, next) => {
  console.error('Error en el servidor:', err);
  res.status(500).send('¡Oops! Algo salió mal en el servidor.');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor ejecutándose en http://0.0.0.0:${PORT}/`);
  console.log('Para jugar, abre el enlace en una nueva pestaña');
});
