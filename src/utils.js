export const isURLValid = (url) => {
  try {
    const newUrl = new URL(url);
    return newUrl.protocol === "http:" || newUrl.protocol === "https:";
  } catch (err) {
    return false;
  }
};

export const getRandomString = (length = 10) => {
  let result = "";
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const charLength = chars.length;
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * charLength)];
  }
  return result;
};

export const generateRandomURL = () => {
  const protocols = ["http", "https"];
  const domains = ["com", "org", "net", "io", "dev"];

  const protocol = protocols[Math.floor(Math.random() * 2)];
  const subdomain = getRandomString(Math.floor(Math.random() * 8) + 3);
  const domain = getRandomString(Math.floor(Math.random() * 8) + 3);
  const domainExtension = domains[Math.floor(Math.random() * domains.length)];

  return `${protocol}://${subdomain}.${domain}.${domainExtension}`;
};
