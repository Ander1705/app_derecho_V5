# 🏛️ Sistema Jurídico - Frontend

Frontend corporativo desarrollado en React + Vite + Tailwind CSS para el sistema de gestión jurídica de la Facultad de Derecho de la Universidad Colegio Mayor de Cundinamarca.

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en: **http://localhost:3000**

## 🎨 Características del Diseño Corporativo

- **🏛️ Tema Universitario**: Diseño profesional para facultad de derecho
- **🎨 Colores Corporativos**: Azul universitario (#1e40af), dorado (#f59e0b) y navy (#1e293b)
- **📱 Responsive Design**: Optimizado para escritorio, tablet y móvil
- **♿ Accesibilidad**: Cumple con estándares WCAG 2.1

## 📁 Estructura del Proyecto

```
src/
├── components/           # Componentes reutilizables
│   ├── auth/            # Autenticación
│   ├── layout/          # Layout y navegación
│   └── common/          # Componentes comunes
├── pages/               # Páginas de la aplicación
│   ├── auth/            # Login
│   ├── clients/         # Gestión de clientes
│   └── forms/           # Formularios legales
├── contexts/            # Contextos React (AuthContext)
└── services/            # Servicios API
```

## 🔧 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm run preview` - Preview del build

## 🌐 Integración con Backend

- **API Base**: http://localhost:8000/api
- **Proxy configurado**: Vite proxy hacia el backend
- **Autenticación**: JWT tokens con refresh automático

## 👥 Credenciales de Prueba

- **Email**: test@admin.com
- **Password**: admin123
- **Rol**: admin

---

**Frontend desarrollado para la Facultad de Derecho - Universidad Colegio Mayor de Cundinamarca** 🏛️
