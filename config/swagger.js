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
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
      }
    }
  },
  apis: ["./*/routes/*.routes.js"]
};

export const swaggerSpec = swaggerJSDoc(options);
