import { html } from 'satori-html'
import backgroundBase64 from './base64'

import type { BgType } from '../../src/types'

export const ogImageMarkup = (
  authorOrBrand: string,
  title: string,
  bgType: BgType
) => {
  if (!['plum', 'dot', 'rose', 'particle'].includes(bgType))
    throw new Error(
      "The value of 'bgType' must be one of the following: 'plum', 'dot', 'rose', 'particle'."
    )

  return html`<div
    tw="relative flex justify-center items-center w-full h-full"
    style="font-family: 'Inter'"
  >
    <img
      tw="absolute inset-0 w-full h-full"
      src="${backgroundBase64[bgType]}"
      alt="open graph"
    />

    <div tw="flex items-center justify-start w-full px-18" style="gap: 20px">
      <div tw="self-start flex justify-center items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="7.5em"
          height="7.5em"
          viewBox="0 0 433 433"
        >
          <path d="M192.045 260.616l-87.423 63.883c-10.4949 7-18.6134 11.633-29.1082 11.633C54.5243 336.132 37 317.598 37 296.698c0-17.449 13.96-30.166 26.8309-35.983l102.5711-44.067-102.5711-45.447C49.8709 165.483 37 152.667 37 135.217c0-20.801 18.6133-38.2505 39.6029-38.2505 10.4947 0 17.5242 3.4505 28.0191 11.6325l87.423 63.883-11.683-103.4148C176.897 44.7169 193.233 25 216.5 25c23.267 0 39.603 18.5338 36.138 42.9828L240.955 172.482l87.423-63.883c10.495-8.083 18.613-11.6325 29.108-11.6325 20.99 0 38.415 17.4495 38.415 38.3495 0 18.534-12.772 30.167-26.831 35.983l-102.571 45.25 102.67 44.067C383.129 266.433 396 279.15 396 297.783c0 20.9-18.613 38.349-39.603 38.349-9.307 0-17.524-4.633-28.019-11.633l-87.423-63.883 11.683 103.317C256.103 388.283 239.866 408 216.5 408c-23.267 0-39.603-18.534-36.138-42.983l11.683-104.401z" fill="url(#paint0_linear)"/>
          <defs>
            <linearGradient id="paint0_linear" x1="37" y1="24.9999" x2="380.684" y2="214.48" gradientUnits="userSpaceOnUse">
              <stop offset=".34375" stop-color="#FF7A18"/>
              <stop offset=".666667" stop-color="#D33961"/>
              <stop offset="1" stop-color="#36ACB4"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div tw="flex flex-col" style="gap: 10px">
        <div tw="text-[#858585] text-2.1rem">${authorOrBrand}</div>
        <div tw="text-white text-3.1rem leading-relaxed mr-18">${title}</div>
      </div>
    </div>
  </div>`
}
