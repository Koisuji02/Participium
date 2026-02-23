function formatString(str: string) {
  return str
    .replaceAll('_', " ")            
    .toLowerCase()                 
    .replaceAll(/\b\w/g, c => c.toUpperCase());
}

function formatStatus(str: string) {
    return str
      .replaceAll('_', " ");
  }

export { formatString, formatStatus };