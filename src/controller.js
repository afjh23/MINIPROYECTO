import path from 'node:path';
import fs from 'node:fs/promises';
import { pool } from './db.js';

export const index = async (req, res) => {
  const ruta = path.resolve('./public/index.html');
  const contenido = await fs.readFile(ruta, 'utf-8');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(contenido);
}

export const getUsuarios = async (req, res) => {
  const resultado = await pool.query('SELECT * FROM usuarios');
  const usuario = resultado[0];
  const stringData = JSON.stringify(usuario);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(stringData);
}

export const exportUsuarios = async (req, res) => {
  const resultado = await pool.query('SELECT * FROM usuarios')
  const usuarios = resultado[0]
  const cabeceras = Object.keys(usuarios[0]).join(',')

  const filas = usuarios.reduce((acc, usuario) => {
    const string = `\n ${usuario.id}, ${usuario.nombres}, ${usuario.apellidos}, ${usuario.direccion}, ${usuario.correo}, ${usuario.dni}, ${usuario.edad}, ${usuario.fecha_creacion}, ${usuario.telefono}, ${usuario.username}, ${usuario.password}, ${usuario.status} , ${usuario.genero}`
    return acc + string
  })
  const contenido = cabeceras + filas
  await fs.writeFile('usuario.csv', contenido)


  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ message: 'Datos de las revistas exportadas al archivo usuario.csv' }))
}

const validarCorreo = (correo) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(correo);
};

export const importUsuarios = async (req, res) => {
  try {
    const contenido = await fs.readFile('usuario.csv', 'utf-8');
    const filas = contenido.split('\n');
    filas.shift(); // Eliminar la fila de encabezado

    const errores = [];

    for (const fila of filas) {
      if (!fila.trim()) continue;
      const valores = fila.split(',').map(valor => valor.trim());
      const nombres = valores[1];
      const apellidos = valores[2];
      const direccion = valores[3];
      const correo = valores[4];
      const dni = valores[5];
      const edad = valores[6];
      const fecha_creacion = valores[7];
      const telefono = valores[8];
      const username = valores[9];
      const password = valores[10];
      const status = valores[11];
      const genero = valores[12];

      if (!validarCorreo(correo)) {
        const mensajeError = `Correo electrónico inválido para el usuario ${nombres}: ${correo}`;
        console.log(mensajeError);
        errores.push(mensajeError);
        continue;
      }

      try {
        await pool.execute(
          'INSERT INTO usuarios(nombres, apellidos, direccion, correo, dni, edad, fecha_creacion, telefono, username, password, status, genero) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
          [nombres, apellidos, direccion, correo, dni, edad, fecha_creacion, telefono, username, password, status, genero]
        );
        console.log('Se insertó el usuario', nombres);
      } catch (error) {
        console.log('Error de inserción:', error); // Agregar este log para inspeccionar errores

        if (error.errno === 1062) {
          const mensajeError = `No se insertó el usuario ${nombres} - Usuario duplicado`;
          console.log(mensajeError);
          errores.push(mensajeError);
        } else {
          const mensajeError = `Error al insertar el usuario ${nombres} - ${error.message}`;
          console.log(mensajeError);
          errores.push(mensajeError);
        }
      }
    }

    if (errores.length > 0) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Datos importados con errores', errores }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Datos importados sin errores' }));
    }
  } catch (error) {
    console.log('Error en la lectura del archivo', error.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Error en la importación' }));
  }
};