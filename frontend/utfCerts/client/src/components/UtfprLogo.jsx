export function UtfprLogo({ className = 'h-7 w-auto' }) {
	return (
		<svg
			viewBox="0 0 184 44"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-label="UTFPR"
		>
			{/* U */}
			<path
				d="M4 4H12V28C12 31.3 14.4 33.5 18 33.5C21.6 33.5 24 31.3 24 28V4H32V28.2C32 36.2 26.2 40.5 18 40.5C9.8 40.5 4 36.2 4 28.2V4Z"
				fill="#18181A"
			/>
			{/* T horizontal bar + vertical stem */}
			<path
				d="M36 4H74V11.5H59V40H51V11.5H36V4Z"
				fill="#18181A"
			/>
			{/* F iconic UTFPR yellow corner + inner black block */}
			<path
				d="M63 14.5H88V21.5H70.5V40H63V14.5Z"
				fill="#F2B705"
			/>
			<path
				d="M73.5 24.5H88V31H80.5V40H73.5V24.5Z"
				fill="#18181A"
			/>
			{/* PR */}
			<text
				x="96"
				y="39"
				fill="#18181A"
				fontFamily="DM Sans, Arial, sans-serif"
				fontWeight="700"
				fontSize="36"
				letterSpacing="-1.5"
			>
				PR
			</text>
		</svg>
	);
}
