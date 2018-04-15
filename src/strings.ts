export function kebabCase2CamelCase(kebabCase: string): string {
  const str = kebabCase.replace(/ /g, '');
  const words = str.split('-');
  const capitalizedWords = words.slice(1).map(word => word[0].toUpperCase() + word.substr(1).toLowerCase());
  return words[0].toLowerCase() + capitalizedWords.join('');
}

export function kebabCase2UpperCamelCase(kebabCase: string): string {
  const str = kebabCase.replace(/ /g, '');

  if (str) {
    const words = str.split('-');
    const capitalizedWords = words.map(word => word[0].toUpperCase() + word.substr(1).toLowerCase());
    return capitalizedWords.join('');
  } else {
    return str;
  }
}
