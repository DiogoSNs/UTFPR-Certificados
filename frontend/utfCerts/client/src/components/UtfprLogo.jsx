export function UtfprLogo({ className = 'h-7 w-auto' }) {
	return (
		<svg
			viewBox="0 0 156 44"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-label="UTFPR"
		>
			{/* U unido ao T (haste direita do U forma o T) */}
			<path
				d="M4 4H12.5V26.5C12.5 30.8 15.2 33.2 19.5 33.2C23.8 33.2 26.5 30.8 26.5 26.5V4H82V11.5H35V40H26.5V35.2C24.4 38.6 21.5 40.5 18 40.5C9.5 40.5 4 35.5 4 27V4Z"
				fill="#18181A"
			/>
			{/* L amarelo do F */}
			<path
				d="M39 14.5H82V22H47V40H39V14.5Z"
				fill="#F2B705"
			/>
			{/* L preto interno do F */}
			<path
				d="M50.5 25H82V32H58.5V40H50.5V25Z"
				fill="#18181A"
			/>
			{/* PR */}
			<text
				x="88"
				y="40"
				fill="#18181A"
				fontFamily="DM Sans, Arial, sans-serif"
				fontWeight="700"
				fontSize="32"
				letterSpacing="-1"
			>
				PR
			</text>
		</svg>
	);
}
