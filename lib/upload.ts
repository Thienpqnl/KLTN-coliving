export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "thien1");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/dtfs1ppk7/image/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();

  if (!res.ok || !data.secure_url) {
    throw new Error(data.error?.message || "Upload image failed");
  }

  return data.secure_url;
};
