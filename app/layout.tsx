import './globals.css'; import 'leaflet/dist/leaflet.css';
export const metadata={title:'Younes on Tour',description:'Rad- und Laufabenteuer, Routen, Fotos und Challenges.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="de"><body>{children}</body></html>}
