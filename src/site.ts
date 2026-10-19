// DATOS DE PRUEBA: reemplazar por los datos reales del local antes de publicar.
export const site = {
  name: "El Barbudo",
  tagline: "Barbería y perfumería en Asunción",
  address: "Av. Mariscal López 1234, Asunción, Paraguay",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Av.+Mariscal+L%C3%B3pez+1234+Asunci%C3%B3n",
  hours: [
    { days: "Lunes a viernes", time: "09:00 a 20:00" },
    { days: "Sábados", time: "09:00 a 18:00" },
    { days: "Domingos", time: "Cerrado" },
  ],
  instagram: "https://www.instagram.com/elbarbudo.py",
  // Respaldo si falta NEXT_PUBLIC_WHATSAPP_NUMBER: un marcador que no es de nadie (el build de producción lo rechaza).
  whatsapp: "595000000000",
  about: {
    title: "Sobre El Barbudo",
    body: [
      "Somos una barbería de barrio con una selección cuidada de perfumes. Cortes clásicos, barba a navaja y fragancias que duran todo el día.",
      "Atendemos con turno y también sin turno. Si no sabés cuál perfume elegir, te ayudamos a encontrar el tuyo.",
    ],
    image: "https://images.unsplash.com/photo-1512690459411-b9245aed614b?w=1600&q=75",
  },
};
