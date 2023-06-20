import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
	AuthControllerAfterLoginEvent,
	AuthControllerAfterProfileEvent,
	AuthControllerBeforeProfileEvent,
	AuthControllerBeforeValidationEvent,
} from "@open-press/backend-interfaces";
import {
	LoginRequestDto,
	LoginRequestValidationSchema,
} from "@open-press/backend-interfaces/lib/dtos/login-request.dto";
import { User, UserDocument, UserEntity } from "@open-press/models";
import { PublicEndpoint, RestUser } from "@open-press/support";
import { validate } from "@open-press/utility";
import { Request } from "express";
import { tap } from "lodash";
import { AuthService } from "./auth.service";
import { AUTH_CONTROLLER_EVENTS } from "./constants";
import { JwtAuthGuard, LocalAuthGuard } from "./guards";

@PublicEndpoint()
@Controller("auth")
export class AuthController {
	constructor(private readonly auth_service: AuthService, private readonly _event_emitter: EventEmitter2) {}

	/**
	 * Authenticates a user with email and password then returns an access token.
	 * @param {e.Request} request
	 * @param login_request
	 * @returns {Promise<{access_token: string}>}
	 */
	@UseGuards(LocalAuthGuard)
	@Post("login")
	async login(@Req() request: Request, @Body() login_request: LoginRequestDto) {
		login_request = validate(login_request, LoginRequestValidationSchema);

		this._event_emitter.emit(AUTH_CONTROLLER_EVENTS.before_validation, {
			request,
		} as AuthControllerBeforeValidationEvent);

		return tap(await this.auth_service.login(request.user as UserDocument, login_request.remember_me), (jwt) => {
			this._event_emitter.emit(AUTH_CONTROLLER_EVENTS.after_login, { jwt } as AuthControllerAfterLoginEvent);
		});
	}

	/**
	 * Returns the user's profile.
	 * @param {UserDocument} user The user document.
	 * @returns {Promise<User>} The user profile.
	 */
	@PublicEndpoint(false)
	@UseGuards(JwtAuthGuard)
	@Get("profile")
	async profile(@RestUser() user: UserDocument): Promise<UserEntity> {
		this._event_emitter.emit(AUTH_CONTROLLER_EVENTS.before_profile, { user } as AuthControllerBeforeProfileEvent);

		return tap(new UserEntity(user.toObject()), (entity) => {
			this._event_emitter.emit(AUTH_CONTROLLER_EVENTS.after_profile, {
				entity,
			} as AuthControllerAfterProfileEvent);
		});
	}
}