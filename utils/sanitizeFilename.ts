// Función para sanear el filename
export const sanitizeFilename = (filename: string): string => {
    if (!filename) return "";

    // Eliminar la extensión del archivo
    const withoutExtension = filename.replace(/\.[^/.]+$/, "");

    // Reemplazar guiones bajos y guiones por espacios
    const withSpaces = withoutExtension.replace(/[_-]/g, " ");

    // Capitalizar la primera letra de cada palabra y convertir el resto a minúsculas
    return withSpaces
        .split(" ")
        .filter(word => word.trim() !== "") // Eliminar palabras vacías si hay múltiples espacios
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
};