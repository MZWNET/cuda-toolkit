export const REACT_PROPS_REGEX = /data-react-props="([^"]+)"/
export const VERSION_REGEX = /CUDA Toolkit\s+([0-9.]+)/i
export const ARCHIVE_LINK_REGEX = /<a[^>]+href="([^"]+)"[^>]*>(CUDA Toolkit[^<]*)<\/a>/gi
export const ARCHIVE_LEADING_VERSION_REGEX = /^CUDA Toolkit\s+(\d+\.\d+(?:\.\d+)?)/i
export const URL_VERSION_REGEX = /https:\/\/developer\.download\.nvidia\.com\/compute\/cuda\/([0-9.]+)\//
export const URL_FILENAME_VERSION_REGEX = /cuda_([0-9.]+)[_.]/i
export const PRIMARY_DOWNLOAD_REGEX = /targetDownloadButtonHref[^>]+href="([^"]+)"/
export const FALLBACK_DOWNLOAD_REGEX = /href="(https:\/\/developer\.download\.nvidia\.com\/compute\/cuda\/[^"]+)"/
export const PATCHES_REGEX = /patches/i
export const LEGACY_LINUX_RUNFILE_REGEX = /(?:https?:\/\/developer\.download\.nvidia\.com)?\/compute\/cuda\/[0-9.]+(?:\/Prod[^/]*)?\/local_installers2?\/[^"'\s><]*_linux[^"'\s><]*/gi
export const LEGACY_LINUX_RUNFILE_FALLBACK_REGEX = /(?:https?:\/\/developer\.download\.nvidia\.com)?\/compute\/cuda\/[0-9.]+(?:\/Prod[^/]*)?\/local_installers2?\/[^"'\s><]*_linux[^"'\s><]*/gi
export const LEGACY_WINDOWS_LOCAL_REGEX = /(?:https?:\/\/developer\.download\.nvidia\.com)?\/compute\/cuda\/[0-9.]+(?:\/Prod[^/]*)?\/local_installers2?\/[^"'\s><]*(?:win|windows)[^"'\s><]*/gi
export const LEGACY_WINDOWS_NETWORK_REGEX = /(?:https?:\/\/developer\.download\.nvidia\.com)?\/compute\/cuda\/[0-9.]+(?:\/Prod[^/]*)?\/network_installers2?\/[^"'\s><]*(?:win|windows)[^"'\s><]*_network(?:\.exe)?/gi
export const WIN10_REGEX = /win10/i
