const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { render } = require('ejs');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const app = express();
app.use(cors());  // Para evitar problemas con el navegador
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set("view engine", "ejs");


// Conexión a la base de datos

const conexion = mysql.createConnection({
    host: "localhost",
    database: "bd_centro_comercial",
    user: "root",
    password: ""
});
// Verificar conexión a la base de datos
conexion.connect((err) => {
    if (err) {
        console.error("Error al conectar con la base de datos:", err);
        return;
    }
    console.log("Conexión a la base de datos exitosa");
});


//Rutas
app.get("/", function (req, res) {
    res.render("index");
});
app.get("/admin", function (req, res) {
    res.render("admin");
});
app.use(express.static("public"));


// Configurar Multer para guardar las imágenes en public/img
const storage = multer.diskStorage({
    destination: path.join(__dirname, "public/img"),
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Nombre único
    }
});

//Subir Imagenes

const upload = multer({ storage });

// Ruta para subir imágenes
app.post("/subir-imagen", upload.single("imagen"), (req, res) => {
    if (!req.file) {
        return res.status(400).send("No se subió ninguna imagen");
    }
    res.redirect("/medios"); // Recargar la galería después de subir
});

app.get("/medios", (req, res) => {
    const imageDir = path.join(__dirname, "public/img");
    const limit = 12; // Imágenes por página

    fs.readdir(imageDir, (err, files) => {
        if (err) {
            console.error("Error leyendo la carpeta de imágenes:", err);
            return res.status(500).send("Error al cargar imágenes");
        }

        // Filtrar y ordenar imágenes por fecha de modificación
        const images = files
            .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
            .map(file => ({
                name: file,
                time: fs.statSync(path.join(imageDir, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time)
            .map(file => file.name);

        // Obtener página actual desde la URL (por defecto es 1)
        const page = parseInt(req.query.page) || 1;
        const totalPages = Math.ceil(images.length / limit);
        
        // Asegurar que la página no sea menor a 1 ni mayor al total de páginas
        if (page < 1 || page > totalPages) {
            return res.redirect("/medios?page=1");
        }

        // Obtener imágenes correspondientes a la página actual
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedImages = images.slice(startIndex, endIndex);

        res.render("medios", { images: paginatedImages, totalPages, currentPage: page });
    });
});
const uploadFolder = path.join(__dirname, "public/img");
//Eliminar Imagenes
app.post("/eliminar-imagen", (req, res) => {
    const { imagen } = req.body; // Recibir el nombre de la imagen desde AJAX
    if (!imagen) {
        return res.json({ success: false, message: "No se especificó una imagen" });
    }

    const imagePath = path.join(uploadFolder, imagen);

    // Verificar si la imagen existe antes de eliminarla
    fs.access(imagePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.json({ success: false, message: "Imagen no encontrada" });
        }

        // Eliminar la imagen
        fs.unlink(imagePath, (err) => {
            if (err) {
                return res.json({ success: false, message: "No se pudo eliminar la imagen" });
            }
            res.json({ success: true, message: "Imagen eliminada correctamente" });
        });
    });
});

//Token
const SECRET_KEY = "secreto_super_seguro";

// Middleware para verificar el token|
// const verificarToken = (req, res, next) => {
//     const token = req.headers["token"];
//     if (!token) {
//         // res.redirect("/admin");
//         res.status(403).json({ success: false, message: "Token requerido", token });1
//     }
//     jwt.verify(token, "secreto_super_seguro", (err, decoded) => {
//         if (err) {
//             return res.status(401).json({ success: false, message: "Token inválido" });
//         }
//         req.usuario = decoded;
//         next();
//     });

// };


// **Ruta para iniciar sesión**
app.post("/login", (req, res) => {
    const { usuario, password } = req.body;

    // Buscar usuario en la base de datos
    conexion.query("SELECT * FROM administradores WHERE usuario = ?", [usuario], async (err, results) => {
        if (err) {
            console.error("Error en la consulta SQL:", err);
            return res.status(500).json({ success: false, message: "Error del servidor" });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: "Usuario no encontrado" });
        }

        const admin = results[0];

        // Comparar la contraseña ingresada con la encriptada en la base de datos
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Contraseña incorrecta" });
        }

        // Crear el token JWT con duración de 2 horas
        const token = jwt.sign(
            { id: admin.id, usuario: admin.usuario },
            SECRET_KEY,
            { expiresIn: "30m" }
        );

        res.json({ success: true, message: "Inicio de sesión exitoso", token });
    });
});


app.get("/formulario", (req, res) => {
    res.render("formulario");
});

// const usuario = "CentroComercialYantzaza";
// const passwordPlano = "M3rcad0Y@ntzaz42025";

// bcrypt.hash(passwordPlano, 10, (err, hash) => {
//     if (err) console.error("Error encriptando contraseña:", err);

//     conexion.query("INSERT INTO administradores (usuario, password) VALUES (?, ?)", [usuario, hash], (err, result) => {
//         if (err) console.error("Error insertando administrador:", err);
//         else console.log("Administrador insertado con éxito");
//     });
// });


// Ruta para agregar un nuevo local

app.post('/agregar-local', (req, res) => {
    const { propietario, cedula, nombre_local, telefono, email, descripcion, categoria, horario, local_externo, n_local, facebook, tiktok, url_imagen } = req.body;
    const categoriasPermitidas = ["locales_abarrotes", "locales_comedores", "locales_cafeteria", "locales_externos", "locales_ropa", "locales_batidos", "locales_islas", "locales_carnes", "locales_productos_zona", "locales_frutas", "locales_verduras", "locales_montes"];

    // Validar que la categoría sea válida
    if (!categoriasPermitidas.includes(categoria)) {
        return res.render("formulario", { mensaje: "Categoría no válida", mensajeTipo: "error" });
    }

    let mensaje = "";
    let mensajeTipo = "";

    // Escapar el nombre de la tabla
    let buscar = "SELECT * FROM " + conexion.escapeId(categoria) + " WHERE cedula = ? OR n_local = ?";

    conexion.query(buscar, [cedula, n_local], function (error, rows) {
        if (error) {
            console.error("Error al buscar en la base de datos:", error);
            mensaje = "Error al buscar en la base de datos";
            mensajeTipo = "error";
            return res.render("formulario", { mensaje, mensajeTipo });
        }

        if (rows.length > 0) {
            mensaje = "Cédula o número de local ya existen";
            mensajeTipo = "error";
            return res.render("formulario", { mensaje, mensajeTipo });
        }
        if (categoria == "locales_islas" || categoria == "locales_externos") {
            let agregar = "INSERT INTO " + conexion.escapeId(categoria) + " (propietario, cedula, nombre_local, contacto, email, horario, categoria, n_local, descripcion, facebook, imagen, tiktok) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            conexion.query(agregar, [propietario, cedula, nombre_local, telefono, email, horario, local_externo, n_local, descripcion, facebook, url_imagen, tiktok], (error, results) => {
                if (error) {
                    console.error("Error al insertar en la base de datos:", error);
                    mensaje = "Error al ingresar en la base de datos";
                    mensajeTipo = "error";
                    return res.render("formulario", { mensaje, mensajeTipo });
                }

                mensaje = "Local agregado correctamente";
                mensajeTipo = "success";
                return res.render("formulario", { mensaje, mensajeTipo });
            });
        } else {
            let agregar = "INSERT INTO " + conexion.escapeId(categoria) + " (propietario, cedula, nombre_local, contacto, email, horario, n_local, descripcion, facebook, imagen, tiktok) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            conexion.query(agregar, [propietario, cedula, nombre_local, telefono, email, horario, n_local, descripcion, facebook, url_imagen, tiktok], (error, results) => {
                if (error) {
                    console.error("Error al insertar en la base de datos:", error);
                    mensaje = "Error al ingresar en la base de datos";
                    mensajeTipo = "error";
                    return res.render("formulario", { mensaje, mensajeTipo });
                }

                mensaje = "Local agregado correctamente";
                mensajeTipo = "success";
                return res.render("formulario", { mensaje, mensajeTipo });
            });
        }
    });
});

//Mostrar imagenes en una pagina
app.get("/listar-imagenes", (req, res) => {
    const imageDir = path.join(__dirname, "public/img");

    fs.readdir(imageDir, (err, files) => {
        if (err) {
            console.error("Error leyendo la carpeta de imágenes:", err);
            return res.status(500).json({ error: "Error al cargar imágenes" });
        }

        // Filtrar solo archivos de imagen, ignorando carpetas
        const images = files
            .filter(file => {
                const filePath = path.join(imageDir, file);
                return fs.statSync(filePath).isFile() && /\.(jpg|jpeg|png|gif)$/i.test(file);
            });

        res.json({ imagenes: images }); // Enviar solo archivos de imagen
    });
});



// Ruta para obtener los datos de locales y mostrarlos en las pagina
app.get('/zona-verdura', (req, res) => {
    let consulta = "SELECT * FROM locales_verduras";

    // console.log('Ruta /productos-zona accedida');

    conexion.query(consulta, (err, result) => {
        if (err) {
            console.error("Error al obtener los datos:", err);
            return res.status(500).send("Error al obtener los datos");
        } else {
            // console.log("Datos obtenidos:", result);
            res.render("zona-verdura", { locales: result });
        }
    });
});
app.get('/zona-ropa', (req, res) => {
    let consulta = "SELECT * FROM locales_ropa";

    // console.log('Ruta /productos-zona accedida');

    conexion.query(consulta, (err, result) => {
        if (err) {
            console.error("Error al obtener los datos:", err);
            return res.status(500).send("Error al obtener los datos");
        } else {
            // console.log("Datos obtenidos:", result);
            res.render("zona-ropa", { locales: result });
        }
    });
});
app.get('/zona-montes', (req, res) => {
    let consulta = "SELECT * FROM locales_montes";

    // console.log('Ruta /productos-zona accedida');

    conexion.query(consulta, (err, result) => {
        if (err) {
            console.error("Error al obtener los datos:", err);
            return res.status(500).send("Error al obtener los datos");
        } else {
            // console.log("Datos obtenidos:", result);
            res.render("zona-montes", { locales: result });
        }
    });
});
app.get('/zona-batidos', (req, res) => {
    let consulta = "SELECT * FROM locales_batidos";

    // console.log('Ruta /productos-zona accedida');

    conexion.query(consulta, (err, result) => {
        if (err) {
            console.error("Error al obtener los datos:", err);
            return res.status(500).send("Error al obtener los datos");
        } else {
            // console.log("Datos obtenidos:", result);
            res.render("zona-batidos", { locales: result });
        }
    });
});
app.get('/zona-islas', (req, res) => {
    let consulta = "SELECT * FROM locales_islas";

    // console.log('Ruta /productos-zona accedida');

    conexion.query(consulta, (err, result) => {
        if (err) {
            console.error("Error al obtener los datos:", err);
            return res.status(500).send("Error al obtener los datos");
        } else {
            // console.log("Datos obtenidos:", result);
            res.render("zona-islas", { locales: result });
        }
    });
});
app.get('/zona-frutas', (req, res) => {
    let consulta = "SELECT * FROM locales_frutas";

    // console.log('Ruta /productos-zona accedida');

    conexion.query(consulta, (err, result) => {
        if (err) {
            console.error("Error al obtener los datos:", err);
            return res.status(500).send("Error al obtener los datos");
        } else {
            // console.log("Datos obtenidos:", result);
            res.render("zona-frutas", { locales: result });
        }
    });
});
app.get('/zona-comedores', (req, res) => {
    let consulta = "SELECT * FROM locales_comedores";

    // console.log('Ruta /productos-zona accedida');

    conexion.query(consulta, (err, result) => {
        if (err) {
            console.error("Error al obtener los datos:", err);
            return res.status(500).send("Error al obtener los datos");
        } else {
            // console.log("Datos obtenidos:", result);
            res.render("zona-comedores", { locales: result });
        }
    });
});
app.get('/zona-carnes', (req, res) => {
    let consulta = "SELECT * FROM locales_carnes";

    // console.log('Ruta /productos-zona accedida');

    conexion.query(consulta, (err, result) => {
        if (err) {
            console.error("Error al obtener los datos:", err);
            return res.status(500).send("Error al obtener los datos");
        } else {
            // console.log("Datos obtenidos:", result);
            res.render("zona-carnes", { locales: result });
        }
    });
});
app.get('/zona-cafeteria', (req, res) => {
    let consulta = "SELECT * FROM locales_cafeteria";

    // console.log('Ruta /productos-zona accedida');

    conexion.query(consulta, (err, result) => {
        if (err) {
            console.error("Error al obtener los datos:", err);
            return res.status(500).send("Error al obtener los datos");
        } else {
            // console.log("Datos obtenidos:", result);
            res.render("zona-cafeteria", { locales: result });
        }
    });
});
app.get('/zona-abarrotes', (req, res) => {
    let consulta = "SELECT * FROM locales_abarrotes";

    // console.log('Ruta /productos-zona accedida');

    conexion.query(consulta, (err, result) => {
        if (err) {
            console.error("Error al obtener los datos:", err);
            return res.status(500).send("Error al obtener los datos");
        } else {
            // console.log("Datos obtenidos:", result);
            res.render("zona-abarrotes", { locales: result });
        }
    });
});
app.get('/zona-externos', (req, res) => {
    let consulta = "SELECT * FROM locales_externos ORDER BY n_local";

    // console.log('Ruta /productos-zona accedida');

    conexion.query(consulta, (err, result) => {
        if (err) {
            console.error("Error al obtener los datos:", err);
            return res.status(500).send("Error al obtener los datos");
        } else {
            // console.log("Datos obtenidos:", result);
            res.render("zona-externos", { locales: result });
        }
    });
});
app.get('/zona-productos_zona', (req, res) => {
    let consulta = "SELECT * FROM locales_productos_zona";

    // console.log('Ruta /productos-zona accedida');

    conexion.query(consulta, (err, result) => {
        if (err) {
            console.error("Error al obtener los datos:", err);
            return res.status(500).send("Error al obtener los datos");
        } else {
            // console.log("Datos obtenidos:", result);
            res.render("zona-productos_zona", { locales: result });
        }
    });
});


///TABLA DE LOCALES
var busc;
// Ruta para obtener los datos y mostrarlos en una tabla
app.get('/tabla-locales', (req, res) => {
    const buscar = req.query.buscar; // Obtener el valor de "buscar" desde los query parameters

    // Lista de tablas permitidas
    const tablasPermitidas = [
        "locales_comedores", "locales_abarrotes", "locales_cafeteria", "locales_ropa", "locales_batidos", "locales_islas",
        "locales_carnes", "locales_productos_zona", "locales_frutas",
        "locales_verduras", "locales_montes", "locales_externos"
    ];

    // Validar que la tabla sea válida
    if (buscar && !tablasPermitidas.includes(buscar)) {
        return res.status(400).send("Tabla no válida");
    }

    // Usar el valor de "buscar" o un valor por defecto
    const nombre_bd = buscar || "locales_abarrotes";
    busc = nombre_bd;
    // Mapa de nombres descriptivos
    const nombresDescriptivos = {
        "locales_abarrotes": "Locales Abarrotes",
        "locales_comedores": "Locales Comedores",
        "locales_cafeteria": "Locales Cafetería",
        "locales_ropa": "Locales Ropa",
        "locales_batidos": "Locales Batidos",
        "locales_islas": "Locales Islas",
        "locales_carnes": "Locales Carnes y Frigoríficos",
        "locales_productos_zona": "Locales Productos de la Zona",
        "locales_frutas": "Locales Frutas",
        "locales_verduras": "Locales Verduras",
        "locales_montes": "Locales Montes de Horchatas",
        "locales_externos": "Locales Externos"
    };

    // Obtener el nombre descriptivo
    const nombreDescriptivo = nombresDescriptivos[nombre_bd] || "Locales";

    // Escapar el nombre de la tabla
    const tablaEscapada = conexion.escapeId(nombre_bd);

    // Construir la consulta SQL
    const consulta = `SELECT * FROM ${tablaEscapada}`;

    // console.log('Ruta /tabla-locales accedida'); // Verifica que se acceda a la ruta
    // console.log('Valor de buscar:', buscar); // Verifica el valor de "buscar"

    conexion.query(consulta, (err, result) => {
        if (err) {
            console.error("Error al obtener los datos:", err);
            return res.status(500).send("Error al obtener los datos");
        } else {
            // console.log("Datos obtenidos:", result);
            const mostrarCategoria = buscar == "locales_externos" || buscar == "locales_islas";
            // Enviar los datos y el nombre descriptivo a la vista
            res.render("tabla-locales", { locales: result, nombreDescriptivo, mostrarCategoria });
        }
    });
    // console.log('Valor de buscar:', buscar, busc); // Verifica el valor de "buscar"

});
// Ruta para borrar un local usando AJAX
app.delete('/borrar-local/:id', (req, res) => {
    const buscar = busc;
    const localId = req.params.id;
    console.log("valor" + localId);
    let borrar = "DELETE FROM " + conexion.escapeId(buscar) + " WHERE id_local = ?";
    conexion.query(borrar, [localId], (err, result) => {
        if (err) {
            res.status(500).json({ success: false, message: 'Error al eliminar el local' });
            return;
        }
        res.status(200).json({ success: true });
    });
});

//Editar y alcutilzar los datos de local
app.post('/actualizar-local', (req, res) => {
    const { id, cedula, propietario, nombre, contacto, horario, categoria, numero, descripcion, facebook, tiktok, imagen } = req.body;
    if (busc == "locales_externos") {
        let actualizar = "UPDATE " + conexion.escapeId(busc) + " SET cedula = ?, propietario = ?, nombre_local = ?, contacto = ?, horario = ?, categoria = ?, n_local = ?, descripcion = ?, facebook = ?, imagen = ?, tiktok =? WHERE id_local = ?";

        conexion.query(actualizar, [cedula, propietario, nombre, contacto, horario, categoria, numero, descripcion, facebook, imagen, tiktok, id], (error, results) => {
            if (error) {
                console.error("Error al actualizar el local:", error);
                return res.status(500).json({ success: false, message: 'Error al actualizar el local, (Cedula y N° Local deben ser unicos)' });
            }
            res.json({ success: true, message: 'Local actualizado correctamente' });
            // console.log('Valor de buscar:', busc); // Verifica el valor de "buscar"
        });
    } else {
        let actualizar = "UPDATE " + conexion.escapeId(busc) + " SET cedula = ?, propietario = ?, nombre_local = ?, contacto = ?, horario = ?, n_local = ?, descripcion = ?, facebook = ?, imagen = ?, tiktok =? WHERE id_local = ?";

        conexion.query(actualizar, [cedula, propietario, nombre, contacto, horario, numero, descripcion, facebook, imagen, tiktok, id], (error, results) => {
            if (error) {
                console.error("Error al actualizar el local:", error);
                return res.status(500).json({ success: false, message: 'Error al actualizar el local (Cedula y N° Local deben ser unicos)' });
            }
            res.json({ success: true, message: 'Local actualizado correctamente' });
            // console.log('Valor de buscar:', busc); // Verifica el valor de "buscar"
        });
    }

});


// Iniciar el servidor
app.listen(8910, () => {
    console.log('Servidor corriendo en http://localhost:8910');
});