import swaggerJSDoc from "swagger-jsdoc";
import { PORT } from "./config.js";

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "API asistencia al evento",
      version: "1.0.0",
      description:
        "Backend de asistencia a un evento con 4 jornadas, sorteos y estadísticas en tiempo real."
    },
    servers: [{ url: `http://localhost:${PORT}`, description: "Local" }],
    tags: [
      { name: "Auth", description: "Login, refresh, logout y usuarios" },
      { name: "Jornadas", description: "Jornadas del evento" },
      { name: "Asistencias", description: "Registro y consulta de asistencias" },
      { name: "Sorteos", description: "Sorteos y ganadores" },
      { name: "Estadisticas", description: "Estadísticas en tiempo real" },
      { name: "General", description: "Health check y meta-información" }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
      }
    }
  },
  apis: ["./*/routes/*.routes.js", "./app.js"]
};

export const swaggerSpec = swaggerJSDoc(options);
